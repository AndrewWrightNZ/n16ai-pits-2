import * as THREE from "three";
import { Camera, Scene, WebGLRenderer } from "three";
import { TilesRenderer } from "3d-tiles-renderer";
import {
  GLTFExtensionsPlugin,
  TileCompressionPlugin,
} from "3d-tiles-renderer/plugins";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// Update your ExtendedTilesRenderer type definition to include properly typed statistics
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
  enableDebugVisual?: boolean;
  traversalCallback?: (tile: any, depth: number, isSeen: boolean) => number;
  maximumMemoryUsage?: number;
  maxConcurrentRequests?: number;
  statistics?: {
    memoryUsage?: number;
    geometryCount?: number;
    textureCount?: number;
    tilesToProcess?: number;
    tilesProcessed?: number;
    tilesLoaded?: number;
    averageTimings?: Record<string, number>;
    [key: string]: any; // Allow for additional statistics properties
  };
  memoryUsed?: number; // Alternative property used in some versions
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
  private materialOverrideInterval: any = null;
  private lastCopyrightUpdateTime = 0;
  private processedObjects = new Set<string>();
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

  // Add this method to your TilesRendererService class

  /**
   * Gets the memory usage statistics from the tiles renderer
   * @returns Memory usage in bytes or undefined if not available
   */
  public getMemoryUsage(): number | undefined {
    if (!this.tilesRenderer) return undefined;

    // Try to access memory usage from statistics
    if ("statistics" in this.tilesRenderer && this.tilesRenderer.statistics) {
      if ("memoryUsage" in this.tilesRenderer.statistics) {
        return this.tilesRenderer.statistics.memoryUsage;
      }
    }

    // Alternative approach: if maximumMemoryUsage and memoryUsed are available properties
    if (
      "maximumMemoryUsage" in this.tilesRenderer &&
      "memoryUsed" in this.tilesRenderer
    ) {
      return this.tilesRenderer.memoryUsed;
    }

    // If both approaches fail, try to use the three.js estimated memory usage
    let totalGeometryMemory = 0;
    let totalTextureMemory = 0;

    this.tilesRenderer.group.traverse((node) => {
      // Type check: only process nodes that are Meshes
      if (node instanceof THREE.Mesh) {
        if (node.geometry) {
          // Estimate geometry memory
          const geometry = node.geometry;
          if (geometry.index) {
            totalGeometryMemory += geometry.index.array.byteLength;
          }

          for (const attribute in geometry.attributes) {
            if (geometry.attributes[attribute].array) {
              totalGeometryMemory +=
                geometry.attributes[attribute].array.byteLength;
            }
          }
        }

        if (node.material) {
          // Handle both single material and material array
          const materials = Array.isArray(node.material)
            ? node.material
            : [node.material];

          materials.forEach((material) => {
            if (material.map) {
              totalTextureMemory += this.estimateTextureMemory(material.map);
            }
            if (material.normalMap) {
              totalTextureMemory += this.estimateTextureMemory(
                material.normalMap
              );
            }
          });
        }
      }
    });

    return totalGeometryMemory + totalTextureMemory;
  }

  /**
   * Estimates the memory used by a texture
   * @param texture The texture to estimate memory for
   * @returns Estimated memory in bytes
   */
  private estimateTextureMemory(texture: THREE.Texture): number {
    if (!texture || !texture.image) return 0;

    const { width, height } = texture.image;
    // Estimate bytes per pixel (RGBA = 4 bytes per pixel)
    const bytesPerPixel = 4;

    return width * height * bytesPerPixel;
  }

  /**
   * Configure the tile loading strategy for maximum quality
   */
  configureLoadingStrategy(): void {
    if (!this.tilesRenderer) return;

    // CHANGE: Lower error target means higher detail
    // Changed from 2.0 to 0.1 for maximum detail
    this.tilesRenderer.errorTarget = 0.1;

    // CHANGE: Higher max depth to allow more detailed tiles
    // Changed from 50 to 200
    this.tilesRenderer.maxDepth = 200;

    // CHANGE: Increase memory limit for maximum quality
    // Changed from 2000MB to 6000MB (6GB)
    if ("maximumMemoryUsage" in this.tilesRenderer) {
      this.tilesRenderer.maximumMemoryUsage = 6000 * 1024 * 1024; // 6GB
    }

    // CHANGE: Increased cache size to keep more tiles in memory
    // Changed from 1000 to 4000
    if (this.tilesRenderer.lruCache) {
      this.tilesRenderer.lruCache.minSize = 4000;
    }

    // CHANGE: Enable loading of sibling tiles for better quality
    // Changed from false to true
    if ("loadSiblings" in this.tilesRenderer) {
      this.tilesRenderer.loadSiblings = true;
    }

    // CHANGE: Enable level of detail for better quality
    // Changed from true to false
    if ("skipLevelOfDetail" in this.tilesRenderer) {
      this.tilesRenderer.skipLevelOfDetail = false;
    }

    // CHANGE: Increase concurrent requests for faster loading
    // Changed from 16 to 32
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
          errorMultiplier = 0.1; // Changed from 0.3 to 0.1 for maximum detail
        } else if (distFromCenter < 0.4) {
          // Near center - high priority
          errorMultiplier = 0.2; // Changed from 0.5 to 0.2
        } else if (distFromCenter < 0.7) {
          // Within screen - normal priority
          errorMultiplier = 0.3; // Changed from 0.8 to 0.3
        } else if (distFromCenter < 1.0) {
          // Edge of screen - slightly lower priority
          errorMultiplier = 0.5; // Changed from 1.2 to 0.5
        } else {
          // Outside screen - lowest priority
          errorMultiplier = 1.0; // Changed from 2.0 to 1.0
        }

        // If camera is moving, slightly reduce detail overall except for center
        if (this.isMoving && distFromCenter > 0.3) {
          errorMultiplier *= 1.2; // Changed from 1.5 to 1.2 for less aggressive reduction
        }

        // Adjust multiplier based on depth to prevent excessive detail at far distances
        if (depth > 30) {
          errorMultiplier *= 1.1; // Changed from 1.2 to 1.1 for more consistent detail
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
          // CHANGE: Increased from 4 to 8 for more aggressive memory optimization during movement
          this.tilesRenderer.errorTarget = 8;
        } else {
          // When stationary, decrease error target for higher detail
          // CHANGE: Increased from 0.5 to 2.0 to maintain memory efficiency
          this.tilesRenderer.errorTarget = 2.0;
        }
      }

      // Save current position and rotation
      this.lastCameraPosition.copy(this.camera.position);
      this.lastCameraRotation.copy(this.camera.rotation);
    }, 100);
  }

  /**
   * Initialize the TilesRenderer with maximum quality configuration
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

    // Configure renderer with maximum quality settings
    // CHANGE: Lower error target (0.1 instead of 2.0) for maximum detail
    tilesRenderer.errorTarget = config.errorTarget || 0.1;
    // CHANGE: Higher max depth (200 instead of 50) for more detailed tiles
    tilesRenderer.maxDepth = config.maxDepth || 200;
    // CHANGE: Larger cache size (4000 instead of 1000)
    tilesRenderer.lruCache.minSize = 4000;

    // Apply advanced config options if provided
    if (config.maximumMemoryUsage !== undefined) {
      tilesRenderer.maximumMemoryUsage = config.maximumMemoryUsage;
    } else {
      // CHANGE: Increased memory limit from 2GB to 6GB
      tilesRenderer.maximumMemoryUsage = 6000 * 1024 * 1024; // 6GB default
    }

    if (config.loadSiblings !== undefined) {
      tilesRenderer.loadSiblings = config.loadSiblings;
    } else {
      // CHANGE: Enable sibling loading by default
      tilesRenderer.loadSiblings = true;
    }

    if (config.skipLevelOfDetail !== undefined) {
      tilesRenderer.skipLevelOfDetail = config.skipLevelOfDetail;
    } else {
      // CHANGE: Enable level of detail by default
      tilesRenderer.skipLevelOfDetail = false;
    }

    if (config.maxConcurrentRequests !== undefined) {
      tilesRenderer.maxConcurrentRequests = config.maxConcurrentRequests;
    } else {
      // CHANGE: Increased concurrent requests from 16 to 32
      tilesRenderer.maxConcurrentRequests = 32;
    }

    // Set up the display callback to intercept tiles as they're created
    if (this.useWhiteMaterial) {
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
              // CHANGE: Less aggressive recovery (0.5 -> 1.0)
              this.tilesRenderer.errorTarget = 1.0;

              // Force update several times
              for (let i = 0; i < 5; i++) {
                this.tilesRenderer.update();
              }

              // Reset error target after recovery
              setTimeout(() => {
                if (this.tilesRenderer) {
                  // CHANGE: Reset to higher error target (0.5 -> 2.0)
                  this.tilesRenderer.errorTarget = 2.0;
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
        if (this.useWhiteMaterial) {
          this.processExistingTiles(tilesRenderer.group);
        }

        // Schedule a few more updates at increasing detail levels
        if (this.tilesRenderer) {
          setTimeout(() => {
            if (this.tilesRenderer) {
              // CHANGE: Less aggressive loading (0.2 -> 1.0)
              this.tilesRenderer.errorTarget = 1.0;
              for (let i = 0; i < 3; i++) {
                this.tilesRenderer.update();
              }
              setTimeout(() => {
                if (this.tilesRenderer) {
                  // CHANGE: Reset to higher error target (0.5 -> 2.0)
                  this.tilesRenderer.errorTarget = 2.0;
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

    // Store original error target
    const originalErrorTarget = this.tilesRenderer.errorTarget || 1;

    // CHANGE: Set less aggressive error target (0.05 -> 1.0)
    this.tilesRenderer.errorTarget = 1.0;

    // Increase maximum memory usage for this operation
    if ("maximumMemoryUsage" in this.tilesRenderer) {
      const originalMemLimit =
        this.tilesRenderer.maximumMemoryUsage || 2000 * 1024 * 1024;

      // CHANGE: Less memory allocation during force load (6GB -> 3GB)
      this.tilesRenderer.maximumMemoryUsage = 3000 * 1024 * 1024; // 3GB for detail

      // Force update several times to ensure tiles get loaded
      for (let i = 0; i < 5; i++) {
        // CHANGE: Reduced iterations (10 -> 5)
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
      for (let i = 0; i < 5; i++) {
        // CHANGE: Reduced iterations (10 -> 5)
        this.tilesRenderer.update();
      }
    }

    // Reset error target after a delay
    setTimeout(() => {
      if (this.tilesRenderer) {
        this.tilesRenderer.errorTarget = originalErrorTarget;
      }
    }, 5000);
  }

  /**
   * Detect and fix missing tiles issue
   */
  detectAndFixMissingTiles(): void {
    if (!this.tilesRenderer) return;

    // Store original settings
    const originalErrorTarget = this.tilesRenderer.errorTarget || 1;

    // First pass: aggressive loading at maximum detail
    // CHANGE: Less aggressive loading (0.05 -> 1.0)
    this.tilesRenderer.errorTarget = 1.0;

    // Maximize detail settings
    if ("maxDepth" in this.tilesRenderer) {
      // CHANGE: Lower max depth (200 -> 80)
      this.tilesRenderer.maxDepth = 80;
    }

    if ("maximumMemoryUsage" in this.tilesRenderer) {
      // CHANGE: Lower memory allocation (6GB -> 3GB)
      this.tilesRenderer.maximumMemoryUsage = 3000 * 1024 * 1024; // 3GB for recovery
    }

    if ("loadSiblings" in this.tilesRenderer) {
      this.tilesRenderer.loadSiblings = true; // Ensure we load siblings
    }

    // Force update several times to ensure tiles get loaded
    for (let i = 0; i < 3; i++) {
      // CHANGE: Reduced iterations (5 -> 3)
      this.tilesRenderer.update();
    }

    // Schedule additional forced updates
    setTimeout(() => {
      if (this.tilesRenderer) {
        // CHANGE: Less aggressive error target (0.02 -> 0.5)
        this.tilesRenderer.errorTarget = 0.5;

        // Force update several more times
        for (let i = 0; i < 2; i++) {
          // CHANGE: Reduced iterations (3 -> 2)
          this.tilesRenderer.update();
        }

        // Restore original settings after recovery completed
        setTimeout(() => {
          if (this.tilesRenderer) {
            this.tilesRenderer.errorTarget = originalErrorTarget;
          }
        }, 3000);
      }
    }, 2000);
  }

  /**
   * Start an interval that continually checks for and overrides materials
   */
  private startMaterialOverrideInterval() {
    if (this.materialOverrideInterval) {
      clearInterval(this.materialOverrideInterval);
    }

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
   * Create a white standard material that better preserves the original geometry's appearance
   * @returns A new white MeshStandardMaterial
   */
  private createWhiteMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4, // Reduced from 0.85 to better show surface detail
      metalness: 0.1, // Slight metalness to add subtle highlights
      flatShading: false,
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
      envMapIntensity: 0.2, // Add subtle environment map reflection
      normalScale: new THREE.Vector2(1, 1), // Preserve normal maps if present
      aoMapIntensity: 0.5, // Preserve ambient occlusion if present
    });
  }

  /**
   * Preserve original material properties when replacing with white material
   * @param originalMaterial The original material to copy properties from
   * @param whiteMaterial The white material to apply properties to
   */
  private preserveMaterialProperties(
    originalMaterial: THREE.Material,
    whiteMaterial: THREE.MeshStandardMaterial
  ): void {
    if (originalMaterial instanceof THREE.MeshStandardMaterial) {
      // Copy normal map if present
      if (originalMaterial.normalMap) {
        whiteMaterial.normalMap = originalMaterial.normalMap;
        whiteMaterial.normalMapType = originalMaterial.normalMapType;
        whiteMaterial.normalScale.copy(originalMaterial.normalScale);
      }

      // Copy roughness map if present
      if (originalMaterial.roughnessMap) {
        whiteMaterial.roughnessMap = originalMaterial.roughnessMap;
        whiteMaterial.roughness = originalMaterial.roughness;
      }

      // Copy metalness map if present
      if (originalMaterial.metalnessMap) {
        whiteMaterial.metalnessMap = originalMaterial.metalnessMap;
        whiteMaterial.metalness = originalMaterial.metalness;
      }

      // Copy ambient occlusion map if present
      if (originalMaterial.aoMap) {
        whiteMaterial.aoMap = originalMaterial.aoMap;
        whiteMaterial.aoMapIntensity = originalMaterial.aoMapIntensity;
      }

      // Copy displacement map if present
      if (originalMaterial.displacementMap) {
        whiteMaterial.displacementMap = originalMaterial.displacementMap;
        whiteMaterial.displacementScale = originalMaterial.displacementScale;
        whiteMaterial.displacementBias = originalMaterial.displacementBias;
      }
    }
  }

  /**
   * Replace materials in a tile with white material while preserving original properties
   * @param tile The tile object to process
   */
  private replaceMaterialsWithWhite(tile: THREE.Object3D): void {
    if (!this.useWhiteMaterial) return;

    if (!tile.userData.whiteMatApplied) {
      tile.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material && !child.userData.whiteMatApplied) {
            const whiteMaterial = this.createWhiteMaterial();
            if (Array.isArray(child.material)) {
              child.material = child.material.map((originalMaterial) => {
                this.preserveMaterialProperties(
                  originalMaterial,
                  whiteMaterial
                );
                return whiteMaterial;
              });
            } else {
              this.preserveMaterialProperties(child.material, whiteMaterial);
              child.material = whiteMaterial;
            }
            child.userData.whiteMatApplied = true;
          }
        }
      });
      tile.userData.whiteMatApplied = true;
    }
  }

  /**
   * Process all existing tiles in the group
   * @param group The group containing tiles
   */
  private processExistingTiles(group: THREE.Object3D): void {
    // Don't log every time during interval
    let processedCount = 0;

    group.traverse((child) => {
      if (child instanceof THREE.Object3D && child !== group) {
        if (!child.userData.whiteMatApplied) {
          this.replaceMaterialsWithWhite(child);
          processedCount++;
        }
      }
    });
  }

  /**
   * Force material update on all objects
   * Call this method after TilesShadowWrapper is used
   */
  public forceUpdateMaterials(): void {
    if (!this.tilesRenderer) return;

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
      // CHANGE: Higher error target for lower memory usage (0.2 -> 1.0)
      this.tilesRenderer.errorTarget = 1.0;

      // Force update several times to recalculate priorities
      for (let i = 0; i < 3; i++) {
        // CHANGE: Reduced iterations (5 -> 3)
        this.tilesRenderer.update();
      }

      // Schedule additional updates after a brief delay
      setTimeout(() => {
        if (this.tilesRenderer) {
          // CHANGE: Higher error target (0.1 -> 1.0)
          this.tilesRenderer.errorTarget = 1.0;

          // Force additional updates
          for (let i = 0; i < 2; i++) {
            // CHANGE: Reduced iterations (3 -> 2)
            this.tilesRenderer.update();
          }

          // Return to normal detail level
          setTimeout(() => {
            if (this.tilesRenderer) {
              // CHANGE: Higher error target (0.5 -> 2.0)
              this.tilesRenderer.errorTarget = 2.0;
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
          // CHANGE: Reduced shadow cast distance (300 -> 200)
          const shadowCastDistance = 200;

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
