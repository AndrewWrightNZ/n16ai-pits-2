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
   */
  constructor(
    camera: Camera,
    renderer: WebGLRenderer,
    scene: Scene,
    apiKey: string
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.apiKey = apiKey;
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

    // Configure renderer settings
    tilesRenderer.errorTarget = 0.25;
    tilesRenderer.maxDepth = 50;
    tilesRenderer.lruCache.minSize = 1000;

    // Configure URL preprocessing
    tilesRenderer.preprocessURL = this.preprocessURL.bind(this);

    // Set up event listeners
    tilesRenderer.addEventListener("load-error", (ev: any) => {
      if (this.onLoadError) {
        this.onLoadError(new Error(ev.error?.message || "Unknown error"));
      }
    });

    tilesRenderer.addEventListener("load-tile-set", () => {
      if (tilesRenderer.rootTileSet && this.onLoadComplete) {
        this.onLoadComplete();
      }
      if (this.onTileCount) {
        this.onTileCount(tilesRenderer.group.children.length);
      }
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
   * Update the renderer (call in animation frame)
   */
  update(): void {
    if (!this.tilesRenderer) return;

    this.tilesRenderer.update();

    // Update tile count occasionally
    if (Math.random() < 0.01 && this.onTileCount) {
      this.onTileCount(this.tilesRenderer.group.children.length);
    }

    // Get attributions if needed
    if (this.onAttributions && this.tilesRenderer.getAttributions) {
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

    // Track processed materials to avoid duplicates
    const processedMaterials = new Set();

    this.tilesRenderer.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Allow meshes to cast shadows only
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materials.forEach((material) => {
            // Skip already processed materials
            if (material.uuid && processedMaterials.has(material.uuid)) {
              return;
            }

            // Mark as processed
            if (material.uuid) {
              processedMaterials.add(material.uuid);
            }

            // Just make sure materials update properly
            material.needsUpdate = true;
          });
        }
      }
    });
  }

  /**
   * Dispose of TilesRenderer resources
   */
  dispose(): void {
    if (!this.tilesRenderer) return;

    this.scene.remove(this.tilesRenderer.group);
    this.tilesRenderer.dispose();
    this.tilesRenderer = null;
    this.processedUrls.clear();
    this.currentSessionId = "";
  }
}

export default TilesRendererService;
