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
  lruCache?: any;
  skipTraversal?: boolean;
  errorThreshold?: number;
  loadSiblings?: boolean;
  skipLevelOfDetail?: boolean;
  optimizeVisibility?: boolean;
  enableDebugVisual?: boolean; // For debugging which tiles are being loaded
  traversalCallback?: (tile: any, depth: number, isSeen: boolean) => number; // For prioritizing tiles
  maximumMemoryUsage?: number; // Memory limit in bytes
  maxConcurrentRequests?: number; // Maximum number of concurrent requests
};

// Event callbacks type definitions
type LoadErrorCallback = (error: Error) => void;
type LoadProgressCallback = (progress: number) => void;
type LoadCompleteCallback = () => void;
type AttributionsCallback = (attributions: string) => void;
type TileCountCallback = (count: number) => void;

// Configuration interface for initializing tiles renderer
interface TilesRendererConfig {
  errorTarget?: number;
  maxDepth?: number;
  maximumMemoryUsage?: number;
  loadSiblings?: boolean;
  skipLevelOfDetail?: boolean;
  maxConcurrentRequests?: number;
}

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
  private centerRaycaster = new THREE.Raycaster();
  private centerVector = new THREE.Vector2(0, 0); // Center of screen
  private lastCameraPosition = new THREE.Vector3();
  private lastCameraRotation = new THREE.Euler();
  private isMoving = false;
  private movementCheckInterval: any = null;
  private tileUpdateScheduled = false;
  private consecutiveErrorCount = 0;
  private lastErrorTime = 0;

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

    // Store initial camera position and rotation for movement detection
    this.lastCameraPosition.copy(camera.position);
    this.lastCameraRotation.copy(camera.rotation);
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
   * Configure the tile loading strategy to prioritize visible tiles in center
   */
  configureLoadingStrategy(): void {
    if (!this.tilesRenderer) return;

    console.log("Configuring loading strategy for center prioritization");

    // Lower error target means more detail is loaded before moving on to other areas
    // 6-8 is typically default, 0.5-2 prioritizes detail
    this.tilesRenderer.errorTarget = 0.5;

    // Higher depth means more detail is loaded
    this.tilesRenderer.maxDepth = 200;

    // Increase memory limit for more tiles
    if ("maximumMemoryUsage" in this.tilesRenderer) {
      this.tilesRenderer.maximumMemoryUsage = 6000 * 1024 * 1024; // 4GB
    }

    // Increase cache size to keep more tiles in memory
    if (this.tilesRenderer.lruCache) {
      this.tilesRenderer.lruCache.minSize = 4000; // Increase from 2000
    }

    // Enable loading of sibling tiles to reduce gaps
    if ("loadSiblings" in this.tilesRenderer) {
      this.tilesRenderer.loadSiblings = true;
    }

    // Don't skip levels of detail for more complete loading
    if ("skipLevelOfDetail" in this.tilesRenderer) {
      this.tilesRenderer.skipLevelOfDetail = false;
    }

    // Increase concurrent requests for faster loading
    if ("maxConcurrentRequests" in this.tilesRenderer) {
      this.tilesRenderer.maxConcurrentRequests = 32;
    }

    // Add traversal callback to modify error multipliers based on distance from center
    this.setupCenterPrioritization();

    // Start tracking camera movement
    this.startMovementDetection();
  }

  /**
   * Set up a callback to prioritize tiles in the center of the view
   */
  private setupCenterPrioritization(): void {
    if (!this.tilesRenderer) return;

    // Set up callback to prioritize center tiles
    this.tilesRenderer.traversalCallback = (
      tile: any,
      depth: number,
      isSeen: boolean
    ) => {
      // Default error multiplier
      let errorMultiplier = 1.0;

      // Skip adjusting priority if tile isn't visible
      if (!isSeen) return errorMultiplier;

      try {
        // Get the center point of the tile's bounding volume
        const boundingVolume = tile.boundingVolume;
        if (!boundingVolume || !boundingVolume.sphere) return errorMultiplier;

        // Create a vector for the center of the tile
        const center = new THREE.Vector3(
          boundingVolume.sphere.center[0],
          boundingVolume.sphere.center[1],
          boundingVolume.sphere.center[2]
        );

        // Convert to screen space
        const tempVector = center.clone();
        tempVector.project(this.camera);

        // Calculate distance from center of screen (0,0) in NDC space
        const distFromCenter = Math.sqrt(
          tempVector.x * tempVector.x + tempVector.y * tempVector.y
        );

        // Adjust error multiplier based on distance from center
        // Tiles closer to center get lower error multiplier (higher priority)
        if (distFromCenter < 0.2) {
          // Very center - highest priority
          errorMultiplier = 0.3;
        } else if (distFromCenter < 0.4) {
          // Near center - high priority
          errorMultiplier = 0.5;
        } else if (distFromCenter < 0.7) {
          // Within screen - normal priority
          errorMultiplier = 0.8;
        } else if (distFromCenter < 1.0) {
          // Edge of screen - slightly lower priority
          errorMultiplier = 1.2;
        } else {
          // Outside screen - lowest priority
          errorMultiplier = 2.0;
        }

        // If camera is moving, slightly reduce detail overall except for center
        if (this.isMoving && distFromCenter > 0.3) {
          errorMultiplier *= 1.5;
        }

        // Adjust multiplier based on depth to prevent excessive detail at far distances
        if (depth > 30) {
          errorMultiplier *= 1.2;
        }
      } catch (e) {
        // If anything fails, just return default multiplier
        console.error("Error in traversal callback:", e);
      }

      return errorMultiplier;
    };
  }

  /**
   * Start tracking camera movement to adjust loading strategy
   */
  private startMovementDetection(): void {
    // Clear existing interval if any
    if (this.movementCheckInterval) {
      clearInterval(this.movementCheckInterval);
    }

    // Check for camera movement every 100ms
    this.movementCheckInterval = setInterval(() => {
      if (!this.camera) return;

      const positionChanged = !this.lastCameraPosition.equals(
        this.camera.position
      );
      const rotationChanged =
        this.lastCameraRotation.x !== this.camera.rotation.x ||
        this.lastCameraRotation.y !== this.camera.rotation.y ||
        this.lastCameraRotation.z !== this.camera.rotation.z;

      // Update movement state
      this.isMoving = positionChanged || rotationChanged;

      // Update error target based on movement
      if (this.tilesRenderer) {
        if (this.isMoving) {
          // During movement, increase error target for smoother navigation
          this.tilesRenderer.errorTarget = 4;
        } else {
          // When stationary, decrease error target for higher detail
          this.tilesRenderer.errorTarget = 0.5;
        }
      }

      // Save current position and rotation
      this.lastCameraPosition.copy(this.camera.position);
      this.lastCameraRotation.copy(this.camera.rotation);
    }, 100);
  }

  /**
   * Initialize the TilesRenderer with default configuration
   */
  initialize(): void {
    this.initializeWithConfig({});
  }

  /**
   * Initialize the TilesRenderer with custom configuration
   * @param config Configuration options for the tiles renderer
   */
  initializeWithConfig(config: TilesRendererConfig): void {
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

    // Configure renderer with default settings
    tilesRenderer.errorTarget = config.errorTarget || 0.5;
    tilesRenderer.maxDepth = config.maxDepth || 200;
    tilesRenderer.lruCache.minSize = 4000;

    // Apply advanced config options if provided
    if (config.maximumMemoryUsage !== undefined) {
      tilesRenderer.maximumMemoryUsage = config.maximumMemoryUsage;
    } else {
      tilesRenderer.maximumMemoryUsage = 6000 * 1024 * 1024; // 4GB default
    }

    if (config.loadSiblings !== undefined) {
      tilesRenderer.loadSiblings = config.loadSiblings;
    }

    if (config.skipLevelOfDetail !== undefined) {
      tilesRenderer.skipLevelOfDetail = config.skipLevelOfDetail;
    }

    if (config.maxConcurrentRequests !== undefined) {
      tilesRenderer.maxConcurrentRequests = config.maxConcurrentRequests;
    } else {
      tilesRenderer.maxConcurrentRequests = 32; // Default to higher concurrent requests
    }

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
      console.error("Tile load error:", ev.error);

      // Track consecutive errors for potential recovery
      const now = Date.now();
      if (now - this.lastErrorTime < 5000) {
        this.consecutiveErrorCount++;
      } else {
        this.consecutiveErrorCount = 1;
      }
      this.lastErrorTime = now;

      // If we hit multiple consecutive errors, trigger recovery
      if (this.consecutiveErrorCount >= 3) {
        console.warn(
          "Multiple consecutive load errors detected, scheduling recovery..."
        );
        this.consecutiveErrorCount = 0;

        // Schedule aggressive reload of visible tiles
        if (!this.tileUpdateScheduled) {
          this.tileUpdateScheduled = true;
          setTimeout(() => {
            if (this.tilesRenderer) {
              console.log("Executing tile load recovery...");
              this.tilesRenderer.errorTarget = 0.2;

              // Force update several times
              for (let i = 0; i < 5; i++) {
                this.tilesRenderer.update();
              }

              // Reset error target after recovery
              setTimeout(() => {
                if (this.tilesRenderer) {
                  this.tilesRenderer.errorTarget = 0.5;
                }
                this.tileUpdateScheduled = false;
              }, 2000);
            }
          }, 1000);
        }
      }

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

        // Schedule a few more updates at increasing detail levels
        if (this.tilesRenderer) {
          setTimeout(() => {
            if (this.tilesRenderer) {
              console.log("Running delayed detail update after initial load");
              this.tilesRenderer.errorTarget = 0.2;
              for (let i = 0; i < 3; i++) {
                this.tilesRenderer.update();
              }
              setTimeout(() => {
                if (this.tilesRenderer) {
                  this.tilesRenderer.errorTarget = 0.5;
                }
              }, 2000);
            }
          }, 2000);
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

    // Apply optimized loading strategy
    this.configureLoadingStrategy();

    // Start checking load progress
    this.checkLoadProgress();

    // Set up interval to continuously force white materials
    if (this.useWhiteMaterial) {
      this.startMaterialOverrideInterval();
    }

    // Reset consecutive error count
    this.consecutiveErrorCount = 0;
  }

  /**
   * Force loading of visible tiles at maximum detail
   */
  forceLoadVisibleTiles(): void {
    if (!this.tilesRenderer) return;

    console.log("Forcing loading of visible tiles at maximum detail");

    // Store original error target
    const originalErrorTarget = this.tilesRenderer.errorTarget || 1;

    // Set extremely low error target to force maximum detail
    this.tilesRenderer.errorTarget = 0.05;

    // Increase maximum memory usage for this operation
    if ("maximumMemoryUsage" in this.tilesRenderer) {
      const originalMemLimit =
        this.tilesRenderer.maximumMemoryUsage || 2000 * 1024 * 1024;
      this.tilesRenderer.maximumMemoryUsage = 6000 * 1024 * 1024; // 5GB for max detail

      // Force update several times to ensure tiles get loaded
      for (let i = 0; i < 10; i++) {
        this.tilesRenderer.update();
      }

      // Reset memory limit after a delay
      setTimeout(() => {
        if (this.tilesRenderer && "maximumMemoryUsage" in this.tilesRenderer) {
          this.tilesRenderer.maximumMemoryUsage = originalMemLimit;
        }
      }, 5000);
    } else {
      // Force update several times to ensure tiles get loaded
      for (let i = 0; i < 10; i++) {
        this.tilesRenderer.update();
      }
    }

    // Reset error target after a delay
    setTimeout(() => {
      if (this.tilesRenderer) {
        this.tilesRenderer.errorTarget = originalErrorTarget;
        console.log("Restored original error target:", originalErrorTarget);
      }
    }, 5000);
  }

  /**
   * Detect and fix missing tiles issue
   */
  detectAndFixMissingTiles(): void {
    if (!this.tilesRenderer) return;

    console.log("Running missing tiles detection and recovery...");

    // Store original settings
    const originalErrorTarget = this.tilesRenderer.errorTarget || 1;

    // First pass: aggressive loading at maximum detail
    this.tilesRenderer.errorTarget = 0.05;

    // Maximize detail settings
    if ("maxDepth" in this.tilesRenderer) {
      this.tilesRenderer.maxDepth = 200;
    }

    if ("maximumMemoryUsage" in this.tilesRenderer) {
      this.tilesRenderer.maximumMemoryUsage = 6000 * 1024 * 1024; // 5GB for recovery
    }

    if ("loadSiblings" in this.tilesRenderer) {
      this.tilesRenderer.loadSiblings = true; // Ensure we load siblings
    }

    // Force update several times to ensure tiles get loaded
    for (let i = 0; i < 5; i++) {
      this.tilesRenderer.update();
    }

    // Schedule additional forced updates
    setTimeout(() => {
      if (this.tilesRenderer) {
        console.log("Running second pass of missing tiles recovery...");
        this.tilesRenderer.errorTarget = 0.02; // Even more detail

        // Force update several more times
        for (let i = 0; i < 3; i++) {
          this.tilesRenderer.update();
        }

        // Restore original settings after recovery completed
        setTimeout(() => {
          if (this.tilesRenderer) {
            console.log(
              "Missing tiles recovery complete, restoring normal settings"
            );
            this.tilesRenderer.errorTarget = originalErrorTarget;
          }
        }, 3000);
      }
    }, 2000);
  }

  /**
   * Identify tiles in the center of the screen
   */
  identifyCenterTiles(): THREE.Object3D[] {
    if (!this.tilesRenderer || !this.camera) return [];

    // Create a raycaster from the camera through the center of the screen
    this.centerRaycaster.setFromCamera(this.centerVector, this.camera);

    // Find tiles intersecting with the center ray
    const intersects = this.centerRaycaster.intersectObjects(
      this.tilesRenderer.group.children,
      true
    );

    return intersects.map((intersect) => intersect.object);
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
      roughness: 0.85,
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

    // After repositioning, force a loading priority reset
    if (this.tilesRenderer) {
      // Lower error target for higher detail at new location
      this.tilesRenderer.errorTarget = 0.2;

      // Force update several times to recalculate priorities
      for (let i = 0; i < 5; i++) {
        this.tilesRenderer.update();
      }

      // Schedule additional updates after a brief delay
      setTimeout(() => {
        if (this.tilesRenderer) {
          // Further reduce error target for super-detailed loading
          this.tilesRenderer.errorTarget = 0.1;

          // Force additional updates
          for (let i = 0; i < 3; i++) {
            this.tilesRenderer.update();
          }

          // Return to normal detail level
          setTimeout(() => {
            if (this.tilesRenderer) {
              this.tilesRenderer.errorTarget = 0.5;
            }
          }, 2000);
        }
      }, 1000);
    }
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
          const shadowCastDistance = 300;

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

    if (this.movementCheckInterval) {
      clearInterval(this.movementCheckInterval);
      this.movementCheckInterval = null;
    }

    if (!this.tilesRenderer) return;

    this.scene.remove(this.tilesRenderer.group);
    this.tilesRenderer.dispose();
    this.tilesRenderer = null;
    this.processedUrls.clear();
    this.currentSessionId = "";
  }
}
