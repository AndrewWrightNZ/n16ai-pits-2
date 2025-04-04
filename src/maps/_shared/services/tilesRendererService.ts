import * as THREE from "three";
import { Camera, Scene, WebGLRenderer } from "three";
import { TilesRenderer } from "3d-tiles-renderer";
import {
  GLTFExtensionsPlugin,
  TileCompressionPlugin,
} from "3d-tiles-renderer/plugins";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// Type for extended TilesRenderer with additional properties
export type ExtendedTilesRenderer = TilesRenderer & {
  loadProgress?: number;
  setLatLonToYUp?: (lat: number, lon: number) => void;
  getAttributions?: (arr: any[]) => void;
  rootTileSet?: any;
  displayCallback?: (tile: any, object: THREE.Object3D) => void;
  errorTarget?: number;
  maxDepth?: number;
};

// Event callbacks type definitions
type LoadErrorCallback = (error: Error) => void;
type LoadProgressCallback = (progress: number) => void;
type LoadCompleteCallback = () => void;
type AttributionsCallback = (attributions: string) => void;
type TileCountCallback = (count: number) => void;

/**
 * Service to manage 3D Tiles renderer
 */
export class TilesRendererService {
  private tilesRenderer: ExtendedTilesRenderer | null = null;
  private processedUrls = new Map<string, string>();
  private currentSessionId = "";
  private camera: Camera;
  private renderer: WebGLRenderer;
  private scene: Scene;
  private apiKey: string;
  private materialReplacementCount = 0;
  private materialOverrideInterval: any = null;
  private lastCopyrightUpdateTime = 0;
  private processedObjects = new Set<string>();

  // Flag to enable white material replacement
  private useWhiteMaterial: boolean = false;

  // Callback handlers
  private onLoadError: LoadErrorCallback | null = null;
  private onLoadProgress: LoadProgressCallback | null = null;
  private onLoadComplete: LoadCompleteCallback | null = null;
  private onAttributions: AttributionsCallback | null = null;
  private onTileCount: TileCountCallback | null = null;

  /**
   * Create a new TilesRendererService
   * @param camera THREE.Camera instance
   * @param renderer WebGLRenderer instance
   * @param scene THREE.Scene instance
   * @param apiKey Google Maps API key
   * @param useWhiteMaterial Whether to replace materials with plain white
   */
  constructor(
    camera: Camera,
    renderer: WebGLRenderer,
    scene: Scene,
    apiKey: string,
    useWhiteMaterial: boolean = false
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.apiKey = apiKey;
    this.useWhiteMaterial = useWhiteMaterial;

    console.log(
      "TilesRendererService initialized, useWhiteMaterial:",
      useWhiteMaterial
    );
  }

  /**
   * Set event callbacks
   */
  setCallbacks({
    onLoadError,
    onLoadProgress,
    onLoadComplete,
    onAttributions,
    onTileCount,
  }: {
    onLoadError?: LoadErrorCallback;
    onLoadProgress?: LoadProgressCallback;
    onLoadComplete?: LoadCompleteCallback;
    onAttributions?: AttributionsCallback;
    onTileCount?: TileCountCallback;
  }): void {
    if (onLoadError) this.onLoadError = onLoadError;
    if (onLoadProgress) this.onLoadProgress = onLoadProgress;
    if (onLoadComplete) this.onLoadComplete = onLoadComplete;
    if (onAttributions) this.onAttributions = onAttributions;
    if (onTileCount) this.onTileCount = onTileCount;
  }

  /**
   * Initialize the TilesRenderer
   */
  initialize(): void {
    const rootUrl = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${this.apiKey}`;
    const tilesRenderer = new TilesRenderer(rootUrl) as ExtendedTilesRenderer;

    // Register plugins
    tilesRenderer.registerPlugin(new TileCompressionPlugin());
    tilesRenderer.registerPlugin(
      new GLTFExtensionsPlugin({
        dracoLoader: new DRACOLoader().setDecoderPath(
          "https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/"
        ),
      })
    );

    // Configure renderer settings based on performance mode
    tilesRenderer.errorTarget = 0.5;
    tilesRenderer.maxDepth = 60; // AW NOTE: Big impact on fluffiness
    tilesRenderer.lruCache.minSize = 2000;

    // Set up the display callback to intercept tiles as they're created
    if (this.useWhiteMaterial) {
      console.log("Setting up display callback for white material replacement");

      // This is the key - we intercept each object as it's about to be added to the scene
      tilesRenderer.displayCallback = (_: any, object: THREE.Object3D) => {
        this.replaceMaterialsWithWhite(object);
        return object;
      };
    }

    // Configure URL preprocessing
    tilesRenderer.preprocessURL = this.preprocessURL.bind(this);

    // Set up event listeners
    tilesRenderer.addEventListener("load-error", (ev: any) => {
      if (this.onLoadError) {
        this.onLoadError(new Error(ev.error?.message || "Unknown error"));
      }
    });

    tilesRenderer.addEventListener("load-tile", (ev: any) => {
      if (this.useWhiteMaterial && ev.target) {
        this.replaceMaterialsWithWhite(ev.target);
      }
    });

    tilesRenderer.addEventListener("load-tile-set", () => {
      if (tilesRenderer.rootTileSet && this.onLoadComplete) {
        this.onLoadComplete();
      }

      if (this.onTileCount) {
        this.onTileCount(tilesRenderer.group.children.length);
      }

      // Process all tiles again after load completes
      setTimeout(() => {
        console.log("Processing all tiles after load complete");
        if (this.useWhiteMaterial) {
          this.processExistingTiles(tilesRenderer.group);
        }
      }, 1000);
    });

    // Configure the renderer
    tilesRenderer.setCamera(this.camera);
    tilesRenderer.setResolutionFromRenderer(this.camera, this.renderer);
    tilesRenderer.group.visible = true;

    // Add to scene
    this.scene.add(tilesRenderer.group);
    this.tilesRenderer = tilesRenderer;

    // Start checking load progress
    this.checkLoadProgress();

    // Set up interval to continuously force white materials
    if (this.useWhiteMaterial) {
      this.startMaterialOverrideInterval();
    }
  }

  /**
   * Start an interval that continually checks for and overrides materials
   */
  private startMaterialOverrideInterval() {
    if (this.materialOverrideInterval) {
      clearInterval(this.materialOverrideInterval);
    }

    console.log("Starting material override interval");

    this.materialOverrideInterval = setInterval(() => {
      if (this.tilesRenderer && this.useWhiteMaterial) {
        this.processExistingTiles(this.tilesRenderer.group);
      }
    }, 2000); // Check every 2 seconds
  }

  /**
   * Process URL to add API key and session ID if needed
   * @param url URL to process
   * @returns Processed URL
   */
  private preprocessURL(url: URL | string): string {
    const urlString = url.toString();

    // Skip blob URLs
    if (urlString.startsWith("blob:")) return urlString;

    // Return cached processed URL if available
    if (this.processedUrls.has(urlString)) {
      return this.processedUrls.get(urlString)!;
    }

    // Extract session ID if present
    const sessionMatch = urlString.match(/[?&]session=([^&]+)/);
    if (sessionMatch && sessionMatch[1]) {
      this.currentSessionId = sessionMatch[1];
    }

    // Add API key if missing
    let processedUrl = urlString;
    if (!processedUrl.includes(`key=${this.apiKey}`)) {
      const joinChar = processedUrl.includes("?") ? "&" : "?";
      processedUrl = `${processedUrl}${joinChar}key=${this.apiKey}`;
    }

    // Add session ID if available and not already in URL
    if (this.currentSessionId && !processedUrl.includes("session=")) {
      processedUrl = `${processedUrl}&session=${this.currentSessionId}`;
    }

    // Cache processed URL
    this.processedUrls.set(urlString, processedUrl);
    return processedUrl;
  }

  /**
   * Create a white standard material
   * @returns A new white MeshStandardMaterial
   */
  private createWhiteMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: true ? 0.7 : 0.85,
      metalness: 0.0,
      flatShading: false,
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide, // Important for better shadow rendering
    });
  }

  /**
   * Replace materials in a tile with white material
   * @param tile The tile object to process
   */
  private replaceMaterialsWithWhite(tile: THREE.Object3D): void {
    // Skip if this implementation isn't using white materials
    if (!this.useWhiteMaterial) return;

    let replacedCount = 0;

    // Track this object as processed
    if (!tile.userData.whiteMatApplied) {
      // Traverse the tile hierarchy
      tile.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Configure for shadows
          child.castShadow = true;
          child.receiveShadow = true;

          // Replace materials with white material
          if (child.material && !child.userData.whiteMatApplied) {
            // Debug original material
            if (replacedCount === 0) {
              console.log("Sample original material:", child.material);
            }

            if (Array.isArray(child.material)) {
              // For meshes with multiple materials, create a new array of materials
              const newMaterials = child.material.map(() => {
                replacedCount++;
                return this.createWhiteMaterial();
              });
              child.material = newMaterials;
            } else {
              // For single material meshes, replace with a new material
              child.material = this.createWhiteMaterial();
              replacedCount++;
            }

            // Force material update
            if (!Array.isArray(child.material)) {
              child.material.needsUpdate = true;
            }

            // Mark as processed
            child.userData.whiteMatApplied = true;
          }
        }
      });

      // Mark the parent as processed
      tile.userData.whiteMatApplied = true;
    }

    // Update total count and log
    if (replacedCount > 0) {
      this.materialReplacementCount += replacedCount;
      console.log(
        `Replaced ${replacedCount} materials in tile, total: ${this.materialReplacementCount}`
      );
    }
  }

  /**
   * Process all existing tiles in the group
   * @param group The group containing tiles
   */
  private processExistingTiles(group: THREE.Object3D): void {
    // Don't log every time during interval
    const shouldLog = !this.materialOverrideInterval || Math.random() < 0.1;

    if (shouldLog) {
      console.log(
        "Processing existing tiles, children count:",
        group.children.length
      );
    }

    let processedCount = 0;

    group.traverse((child) => {
      if (child instanceof THREE.Object3D && child !== group) {
        if (!child.userData.whiteMatApplied) {
          this.replaceMaterialsWithWhite(child);
          processedCount++;
        }
      }
    });

    if (shouldLog && processedCount > 0) {
      console.log(`Processed ${processedCount} objects in the tiles group`);
    }
  }

  /**
   * Force material update on all objects
   * Call this method after TilesShadowWrapper is used
   */
  public forceUpdateMaterials(): void {
    if (!this.tilesRenderer) return;

    console.log("Forcing update of all materials");

    // If white material is enabled, re-process all tiles
    if (this.useWhiteMaterial) {
      // Reset the processed flags to force reprocessing
      this.tilesRenderer.group.traverse((obj) => {
        if (obj.userData) {
          obj.userData.whiteMatApplied = false;
        }
      });

      this.processExistingTiles(this.tilesRenderer.group);
    }
  }

  /**
   * Force white material on a specific object
   * Can be called directly for debugging
   */
  public forceWhiteMaterialOnObject(object: THREE.Object3D): void {
    if (!this.useWhiteMaterial) return;

    console.log("Forcing white material on specific object");
    object.userData.whiteMatApplied = false;
    this.replaceMaterialsWithWhite(object);
  }

  /**
   * Check loading progress periodically
   */
  private checkLoadProgress(): void {
    if (!this.tilesRenderer) return;

    if (this.tilesRenderer.loadProgress !== undefined && this.onLoadProgress) {
      const progress = Math.round(this.tilesRenderer.loadProgress * 100);
      this.onLoadProgress(progress);
    }

    if (this.tilesRenderer.rootTileSet !== null && this.onLoadComplete) {
      this.onLoadComplete();
    } else {
      setTimeout(() => this.checkLoadProgress(), 100);
    }
  }

  /**
   * Get the TilesRenderer instance
   * @returns TilesRenderer instance
   */
  getTilesRenderer(): ExtendedTilesRenderer | null {
    return this.tilesRenderer;
  }

  /**
   * Set position at lat/lon coordinates
   * @param lat Latitude in degrees
   * @param lon Longitude in degrees
   */
  setLatLonPosition(lat: number, lon: number): void {
    if (!this.tilesRenderer || !this.tilesRenderer.setLatLonToYUp) return;

    this.tilesRenderer.setLatLonToYUp(
      lat * THREE.MathUtils.DEG2RAD,
      lon * THREE.MathUtils.DEG2RAD
    );
  }

  /**
   * Toggle the use of white material
   * @param useWhite Whether to use white material
   */
  setUseWhiteMaterial(useWhite: boolean): void {
    if (this.useWhiteMaterial === useWhite) return;

    this.useWhiteMaterial = useWhite;
    console.log("White material mode set to:", useWhite);

    // Update existing tiles if the tilesRenderer exists
    if (this.tilesRenderer && this.useWhiteMaterial) {
      // Reset processed flags
      this.tilesRenderer.group.traverse((obj) => {
        if (obj.userData) {
          obj.userData.whiteMatApplied = false;
        }
      });

      this.processExistingTiles(this.tilesRenderer.group);

      // Start or stop the interval
      if (useWhite) {
        this.startMaterialOverrideInterval();
      } else if (this.materialOverrideInterval) {
        clearInterval(this.materialOverrideInterval);
        this.materialOverrideInterval = null;
      }
    }
  }

  /**
   * Update the renderer (call in animation frame)
   */
  update(): void {
    if (!this.tilesRenderer) return;

    this.tilesRenderer.update();

    // Update tile count occasionally
    if (Math.random() < 0.01 && this.onTileCount) {
      this.onTileCount(this.tilesRenderer.group.children.length);
    }

    // Throttle copyright updates to once every 10 seconds
    const now = Date.now();
    if (
      this.onAttributions &&
      this.tilesRenderer.getAttributions &&
      now - this.lastCopyrightUpdateTime > 10000
    ) {
      try {
        const attributionsArray: any[] = [];
        this.tilesRenderer.getAttributions(attributionsArray);

        const attributionsSet = new Set<string>();
        attributionsArray.forEach((a) => {
          if (a?.value) {
            a.value
              .split(";")
              .forEach((c: string) => attributionsSet.add(c.trim()));
          }
        });

        const attributionsString = Array.from(attributionsSet).join("; ");
        if (attributionsString) {
          this.onAttributions(attributionsString);
        }
        this.lastCopyrightUpdateTime = now;
      } catch (e) {
        // Silently ignore attribution errors
      }
    }
  }

  /**
   * Setup shadow casting for all tiles
   */
  setupShadowsForTiles(): void {
    if (!this.tilesRenderer) return;

    console.log("Setting up shadows for tiles");

    // Create a set to track processed objects
    this.processedObjects.clear();

    // Function to apply shadow settings with distance-based LOD
    const applyShadowSettings = (object: THREE.Object3D) => {
      // Skip if already processed
      if (object.uuid && this.processedObjects.has(object.uuid)) {
        return;
      }

      // Mark as processed
      if (object.uuid) {
        this.processedObjects.add(object.uuid);
      }

      if (object instanceof THREE.Mesh) {
        // Apply distance-based LOD for shadow casting if camera is available
        if (this.camera instanceof THREE.PerspectiveCamera) {
          const distanceToCamera = this.camera.position.distanceTo(
            object.position
          );
          const shadowCastDistance = true ? 300 : 500;

          object.castShadow = distanceToCamera < shadowCastDistance;
        } else {
          object.castShadow = true;
        }

        // Always receive shadows
        object.receiveShadow = true;

        // Update materials
        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach((material) => {
            material.needsUpdate = true;
          });
        }
      }

      // Process children
      if (object.children && object.children.length > 0) {
        object.children.forEach((child) => applyShadowSettings(child));
      }
    };

    // Apply to all tiles
    applyShadowSettings(this.tilesRenderer.group);

    console.log(`Setup shadows for ${this.processedObjects.size} objects`);

    // Force material update after shadow setup
    if (this.useWhiteMaterial) {
      this.forceUpdateMaterials();
    }
  }

  /**
   * Dispose of TilesRenderer resources
   */
  dispose(): void {
    if (this.materialOverrideInterval) {
      clearInterval(this.materialOverrideInterval);
      this.materialOverrideInterval = null;
    }

    if (!this.tilesRenderer) return;

    this.scene.remove(this.tilesRenderer.group);
    this.tilesRenderer.dispose();
    this.tilesRenderer = null;
    this.processedUrls.clear();
    this.currentSessionId = "";
  }
}
