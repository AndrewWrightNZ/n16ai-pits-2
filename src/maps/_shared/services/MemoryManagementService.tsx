import * as THREE from "three";
import type { ExtendedTilesRenderer } from "../services/tilesRendererService";

/**
 * Memory pressure level indicators
 */
export enum MemoryPressureLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  tilesMemoryUsage: number | undefined;
  jsHeapUsed: number;
  jsHeapTotal: number;
  jsHeapLimit: number;
  usagePercentage: number;
  pressureLevel: MemoryPressureLevel;
  lastGarbageCollection: number | null;
}

/**
 * Memory management service for optimizing 3D Tiles memory usage
 */
export class MemoryManagementService {
  private tilesRenderer: ExtendedTilesRenderer | null = null;
  private camera: THREE.Camera | null = null;

  // Configuration
  private memoryThresholds = {
    medium: 60, // % of heap limit
    high: 75,
    critical: 90,
  };

  private optimizationSettings = {
    aggressive: {
      errorTarget: 6,
      maxDepth: 50,
      distanceThreshold: 800, // Distance at which to cull tiles
    },
    normal: {
      errorTarget: 2,
      maxDepth: 100,
      distanceThreshold: 1500,
    },
    detailed: {
      errorTarget: 0.5,
      maxDepth: 200,
      distanceThreshold: 2500,
    },
  };

  // State tracking
  private lastOptimizationTime = 0;
  private lastGarbageCollectionTime: number | null = null;
  private currentPressureLevel: MemoryPressureLevel = MemoryPressureLevel.LOW;
  private disposedGeometries: Set<THREE.BufferGeometry> = new Set();
  private listeners: Array<(stats: MemoryStats) => void> = [];

  /**
   * Initialize memory management service
   * @param tilesRenderer The 3D Tiles renderer
   * @param camera The camera for distance calculations
   */
  public initialize(
    tilesRenderer: ExtendedTilesRenderer,
    camera: THREE.Camera
  ) {
    this.tilesRenderer = tilesRenderer;
    this.camera = camera;

    // Initialize memory settings
    if (tilesRenderer && "maximumMemoryUsage" in tilesRenderer) {
      // Set a default memory ceiling if available
      tilesRenderer.maximumMemoryUsage = 6000 * 1024 * 1024; // 6GB
    }

    // Schedule regular memory checks
    setInterval(() => this.checkMemoryUsage(), 5000);
  }

  /**
   * Add a listener for memory statistics updates
   * @param listener Callback function that receives memory stats
   */
  public addStatsListener(listener: (stats: MemoryStats) => void) {
    this.listeners.push(listener);
  }

  /**
   * Remove a previously added listener
   * @param listener The listener to remove
   */
  public removeStatsListener(listener: (stats: MemoryStats) => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  /**
   * Get current memory usage statistics
   */
  public getMemoryStats(): MemoryStats {
    // Get JS memory stats
    const jsMemory = (window.performance as any).memory || {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
    };

    // Calculate usage percentage
    const usagePercentage =
      (jsMemory.usedJSHeapSize / jsMemory.jsHeapSizeLimit) * 100;

    // Determine memory pressure level
    let pressureLevel = MemoryPressureLevel.LOW;
    if (usagePercentage >= this.memoryThresholds.critical) {
      pressureLevel = MemoryPressureLevel.CRITICAL;
    } else if (usagePercentage >= this.memoryThresholds.high) {
      pressureLevel = MemoryPressureLevel.HIGH;
    } else if (usagePercentage >= this.memoryThresholds.medium) {
      pressureLevel = MemoryPressureLevel.MEDIUM;
    }

    // Get tiles memory usage
    let tilesMemoryUsage: number | undefined = undefined;
    if (
      this.tilesRenderer &&
      "statistics" in this.tilesRenderer &&
      this.tilesRenderer.statistics
    ) {
      tilesMemoryUsage = this.tilesRenderer.statistics.memoryUsage;
    } else if (this.tilesRenderer && "memoryUsed" in this.tilesRenderer) {
      tilesMemoryUsage = this.tilesRenderer.memoryUsed as number;
    }

    return {
      tilesMemoryUsage,
      jsHeapUsed: jsMemory.usedJSHeapSize,
      jsHeapTotal: jsMemory.totalJSHeapSize,
      jsHeapLimit: jsMemory.jsHeapSizeLimit,
      usagePercentage,
      pressureLevel,
      lastGarbageCollection: this.lastGarbageCollectionTime,
    };
  }

  /**
   * Check memory usage and take action if needed
   */
  private checkMemoryUsage() {
    if (!this.tilesRenderer) return;

    const stats = this.getMemoryStats();
    this.currentPressureLevel = stats.pressureLevel;

    // Notify all listeners of the current stats
    this.listeners.forEach((listener) => listener(stats));

    // Implement automatic memory optimization strategies
    const now = Date.now();
    const timeSinceLastOptimization = now - this.lastOptimizationTime;

    // Don't optimize too frequently - wait at least 10 seconds between optimizations
    if (timeSinceLastOptimization < 10000) return;

    switch (stats.pressureLevel) {
      case MemoryPressureLevel.CRITICAL:
        this.applyAggressiveOptimization();
        this.lastOptimizationTime = now;
        break;

      case MemoryPressureLevel.HIGH:
        if (timeSinceLastOptimization > 15000) {
          // Wait longer for high level
          this.applyHighOptimization();
          this.lastOptimizationTime = now;
        }
        break;

      case MemoryPressureLevel.MEDIUM:
        if (timeSinceLastOptimization > 30000) {
          // Wait even longer for medium level
          this.applyMediumOptimization();
          this.lastOptimizationTime = now;
        }
        break;

      default:
        // Reset to normal settings if memory pressure is low and it's been a while
        if (timeSinceLastOptimization > 60000) {
          this.resetToNormalSettings();
          this.lastOptimizationTime = now;
        }
    }
  }

  /**
   * Apply aggressive memory optimization for critical memory pressure
   */
  public applyAggressiveOptimization() {
    if (!this.tilesRenderer || !this.camera) return;

    console.log("Applying AGGRESSIVE memory optimization");

    // 1. Update tiles renderer settings
    if ("errorTarget" in this.tilesRenderer) {
      this.tilesRenderer.errorTarget =
        this.optimizationSettings.aggressive.errorTarget;
    }

    if ("maxDepth" in this.tilesRenderer) {
      this.tilesRenderer.maxDepth =
        this.optimizationSettings.aggressive.maxDepth;
    }

    // 2. Dispose far away geometries
    this.disposeDistantGeometries(
      this.optimizationSettings.aggressive.distanceThreshold
    );

    // 3. Force garbage collection if available
    this.forceGarbageCollection();

    // 4. Try to release texture memory
    this.releaseTextureMemory();

    return true;
  }

  /**
   * Apply high memory optimization for high memory pressure
   */
  private applyHighOptimization() {
    if (!this.tilesRenderer || !this.camera) return;

    console.log("Applying HIGH memory optimization");

    // 1. Update tiles renderer settings
    if ("errorTarget" in this.tilesRenderer) {
      this.tilesRenderer.errorTarget =
        this.optimizationSettings.normal.errorTarget;
    }

    if ("maxDepth" in this.tilesRenderer) {
      this.tilesRenderer.maxDepth = this.optimizationSettings.normal.maxDepth;
    }

    // 2. Dispose far away geometries with a higher threshold
    this.disposeDistantGeometries(
      this.optimizationSettings.normal.distanceThreshold
    );

    // 3. Force garbage collection
    this.forceGarbageCollection();

    return true;
  }

  /**
   * Apply medium memory optimization
   */
  private applyMediumOptimization() {
    if (!this.tilesRenderer) return;

    console.log("Applying MEDIUM memory optimization");

    // 1. Update tiles renderer settings - slightly less detail
    if ("errorTarget" in this.tilesRenderer) {
      // Use a middle ground error target
      this.tilesRenderer.errorTarget =
        (this.optimizationSettings.normal.errorTarget +
          this.optimizationSettings.detailed.errorTarget) /
        2;
    }

    return true;
  }

  /**
   * Reset to normal settings when memory pressure is low
   */
  private resetToNormalSettings() {
    if (!this.tilesRenderer) return;

    // Reset to detailed settings
    if ("errorTarget" in this.tilesRenderer) {
      this.tilesRenderer.errorTarget =
        this.optimizationSettings.detailed.errorTarget;
    }

    if ("maxDepth" in this.tilesRenderer) {
      this.tilesRenderer.maxDepth = this.optimizationSettings.detailed.maxDepth;
    }
  }

  /**
   * Dispose geometries and materials that are far from the camera
   * @param distanceThreshold Distance threshold beyond which to dispose geometries
   */
  private disposeDistantGeometries(distanceThreshold: number) {
    if (!this.tilesRenderer || !this.camera) return;

    let disposedCount = 0;
    const cameraPosition = this.camera.position;

    const processNode = (node: THREE.Object3D) => {
      // Skip already processed nodes
      if (node.userData && node.userData.__disposed) return;

      // Calculate distance to camera if node has a position
      if (node.position) {
        const distance = node.position.distanceTo(cameraPosition);

        // If node is beyond threshold, dispose its resources
        if (distance > distanceThreshold) {
          if (node instanceof THREE.Mesh) {
            // Track if already disposed to avoid double disposal
            if (node.geometry && !this.disposedGeometries.has(node.geometry)) {
              // Only dispose if it's a BufferGeometry to avoid issues
              if (node.geometry instanceof THREE.BufferGeometry) {
                // Add to disposed set to avoid disposing again
                this.disposedGeometries.add(node.geometry);

                // Optional: actually dispose the geometry
                // Only do this if you're sure the node won't be needed again
                // node.geometry.dispose();
              }

              // Make this node invisible
              node.visible = false;
              node.userData.__disposed = true;
              disposedCount++;
            }
          }
        }
      }

      // Process children recursively
      node.children.forEach(processNode);
    };

    // Start processing the tiles group
    processNode(this.tilesRenderer.group);

    console.log(`Disposed/hidden ${disposedCount} distant nodes`);
    return disposedCount;
  }

  /**
   * Attempt to force garbage collection if the API is available
   */
  private forceGarbageCollection() {
    if (window.gc) {
      try {
        window.gc();
        this.lastGarbageCollectionTime = Date.now();
        return true;
      } catch (e) {
        console.log("GC not available or failed");
      }
    }
    return false;
  }

  /**
   * Release texture memory by reducing resolution of distant textures
   */
  private releaseTextureMemory() {
    if (!this.tilesRenderer || !this.camera) return;

    const cameraPosition = this.camera.position;
    let modifiedTextureCount = 0;

    // Process textures in the scene
    this.tilesRenderer.group.traverse((node) => {
      if (node instanceof THREE.Mesh && node.position && node.material) {
        const distance = node.position.distanceTo(cameraPosition);

        // Process materials for distant objects
        if (distance > 1000) {
          const materials = Array.isArray(node.material)
            ? node.material
            : [node.material];

          materials.forEach((material) => {
            // Check for texture maps
            const textureProperties = [
              "map",
              "normalMap",
              "aoMap",
              "specularMap",
            ];

            textureProperties.forEach((prop) => {
              if (material[prop] && material[prop].image) {
                // Lower the anisotropy for distant textures
                if (material[prop].anisotropy > 1) {
                  material[prop].anisotropy = 1;
                  material[prop].needsUpdate = true;
                  modifiedTextureCount++;
                }
              }
            });
          });
        }
      }
    });

    console.log(`Modified ${modifiedTextureCount} textures to save memory`);
    return modifiedTextureCount;
  }
}

// Create a singleton instance for use throughout the application
export const memoryManager = new MemoryManagementService();

// Type definition for window.gc
declare global {
  interface Window {
    gc?: () => void;
  }
}
