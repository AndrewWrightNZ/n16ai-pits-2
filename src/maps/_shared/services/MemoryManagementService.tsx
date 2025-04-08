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

  // CHANGE: Lower memory thresholds to trigger optimization earlier
  private memoryThresholds = {
    medium: 45, // % of heap limit (reduced from 60)
    high: 60, // Reduced from 75
    critical: 75, // Reduced from 90
  };

  // CHANGE: Adjust optimization settings to be more aggressive
  private optimizationSettings = {
    aggressive: {
      errorTarget: 8, // Increased from 6
      maxDepth: 30, // Reduced from 50
      distanceThreshold: 600, // Reduced from 800
    },
    normal: {
      errorTarget: 4, // Increased from 2
      maxDepth: 50, // Reduced from 100
      distanceThreshold: 1000, // Reduced from 1500
    },
    detailed: {
      errorTarget: 2, // Increased from 0.5
      maxDepth: 100, // Reduced from 200
      distanceThreshold: 1500, // Reduced from 2500
    },
  };

  // State tracking
  private lastOptimizationTime = 0;
  private lastGarbageCollectionTime: number | null = null;
  private disposedGeometries: Set<THREE.BufferGeometry> = new Set();
  private listeners: Array<(stats: MemoryStats) => void> = [];

  // CHANGE: Add tracking for memory trend
  private memoryReadings: number[] = [];
  private memoryCheckCount = 0;
  private lastCleanupEffectiveness = 0;

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
      // CHANGE: Reduce default memory ceiling
      tilesRenderer.maximumMemoryUsage = 3000 * 1024 * 1024; // 3GB (reduced from 6GB)
    }

    // CHANGE: Increase the frequency of memory checks from 5000ms to 3000ms
    setInterval(() => this.checkMemoryUsage(), 3000);

    // CHANGE: Schedule periodic aggressive cleanup regardless of memory pressure
    setInterval(() => this.schedulePreventiveMaintenance(), 60000); // Every minute
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

    // CHANGE: Store memory reading for trend analysis
    this.memoryReadings.push(usagePercentage);
    if (this.memoryReadings.length > 10) {
      this.memoryReadings.shift(); // Keep only the last 10 readings
    }

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
    this.memoryCheckCount++;

    // Notify all listeners of the current stats
    this.listeners.forEach((listener) => listener(stats));

    // CHANGE: Calculate memory trend (is memory usage growing?)
    const isMemoryIncreasing = this.isMemoryTrendIncreasing();

    // Implement automatic memory optimization strategies
    const now = Date.now();
    const timeSinceLastOptimization = now - this.lastOptimizationTime;

    // CHANGE: Base decision on both memory level and trend
    // Take action if memory is increasing, even at lower thresholds
    if (
      isMemoryIncreasing &&
      stats.usagePercentage > this.memoryThresholds.medium - 10
    ) {
      console.log(
        "Memory trend is increasing, taking preemptive optimization steps"
      );

      if (stats.pressureLevel === MemoryPressureLevel.LOW) {
        this.applyMediumOptimization();
        this.lastOptimizationTime = now;
      } else if (stats.pressureLevel === MemoryPressureLevel.MEDIUM) {
        this.applyHighOptimization();
        this.lastOptimizationTime = now;
      } else {
        this.applyAggressiveOptimization();
        this.lastOptimizationTime = now;
      }

      return;
    }

    // Don't optimize too frequently - wait at least 5 seconds between optimizations
    // CHANGE: Reduced from 10s to 5s for more responsive memory management
    if (timeSinceLastOptimization < 5000) return;

    switch (stats.pressureLevel) {
      case MemoryPressureLevel.CRITICAL:
        this.applyAggressiveOptimization();
        this.lastOptimizationTime = now;
        break;

      case MemoryPressureLevel.HIGH:
        // CHANGE: Respond faster to HIGH memory pressure (15s → 10s)
        if (timeSinceLastOptimization > 10000) {
          this.applyHighOptimization();
          this.lastOptimizationTime = now;
        }
        break;

      case MemoryPressureLevel.MEDIUM:
        // CHANGE: Respond faster to MEDIUM memory pressure (30s → 20s)
        if (timeSinceLastOptimization > 20000) {
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
   * CHANGE: New method to check if memory usage is trending upward
   */
  private isMemoryTrendIncreasing(): boolean {
    if (this.memoryReadings.length < 3) return false;

    // Check the last 3 readings
    const recent = this.memoryReadings.slice(-3);
    // If memory has increased consistently over the last 3 readings
    return recent[2] > recent[1] && recent[1] > recent[0];
  }

  /**
   * CHANGE: New method to schedule preventive maintenance regardless of current memory pressure
   */
  private schedulePreventiveMaintenance() {
    if (!this.tilesRenderer) return;

    console.log("Performing scheduled preventive memory maintenance");

    // Every 10th maintenance cycle, perform more aggressive cleanup
    if (this.memoryCheckCount % 10 === 0) {
      this.applyHighOptimization();
    } else {
      this.applyMediumOptimization();
    }

    // Force garbage collection
    this.forceGarbageCollection();

    // Schedule a check to evaluate effectiveness after 3 seconds
    const before = this.getMemoryStats().usagePercentage;
    setTimeout(() => {
      const after = this.getMemoryStats().usagePercentage;
      this.lastCleanupEffectiveness = before - after;
      console.log(
        `Memory cleanup effectiveness: ${this.lastCleanupEffectiveness.toFixed(
          2
        )}%`
      );

      // If cleanup was not very effective, try more aggressive approach
      if (
        this.lastCleanupEffectiveness < 2 &&
        after > this.memoryThresholds.medium
      ) {
        console.log(
          "Previous cleanup not effective enough, applying aggressive optimization"
        );
        this.applyAggressiveOptimization();
      }
    }, 3000);
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

    // CHANGE: Reduce maximum memory limit during aggressive optimization
    if ("maximumMemoryUsage" in this.tilesRenderer) {
      this.tilesRenderer.maximumMemoryUsage = 2000 * 1024 * 1024; // 2GB temporary limit
    }

    // 2. Dispose far away geometries
    this.disposeDistantGeometries(
      this.optimizationSettings.aggressive.distanceThreshold
    );

    // 3. Force garbage collection if available
    this.forceGarbageCollection();

    // 4. Try to release texture memory
    this.releaseTextureMemory();

    // CHANGE: Dispose all disposables to free up memory
    this.disposeUnusedResources();

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

    // CHANGE: Temporarily reduce memory limit
    if ("maximumMemoryUsage" in this.tilesRenderer) {
      this.tilesRenderer.maximumMemoryUsage = 2500 * 1024 * 1024; // 2.5GB temporary limit
    }

    // 2. Dispose far away geometries with a higher threshold
    this.disposeDistantGeometries(
      this.optimizationSettings.normal.distanceThreshold
    );

    // 3. Force garbage collection
    this.forceGarbageCollection();

    // CHANGE: Release texture memory in high pressure too
    this.releaseTextureMemory();

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

    // CHANGE: Apply maxDepth in medium optimization too
    if ("maxDepth" in this.tilesRenderer) {
      this.tilesRenderer.maxDepth =
        (this.optimizationSettings.normal.maxDepth +
          this.optimizationSettings.detailed.maxDepth) /
        2;
    }

    // CHANGE: Apply moderate distance geometry disposal
    if (this.camera) {
      this.disposeDistantGeometries(
        (this.optimizationSettings.normal.distanceThreshold +
          this.optimizationSettings.detailed.distanceThreshold) /
          2
      );
    }

    return true;
  }

  /**
   * Reset to normal settings when memory pressure is low
   */
  private resetToNormalSettings() {
    if (!this.tilesRenderer) return;

    console.log("Resetting to NORMAL memory settings");

    // Reset to detailed settings
    if ("errorTarget" in this.tilesRenderer) {
      this.tilesRenderer.errorTarget =
        this.optimizationSettings.detailed.errorTarget;
    }

    if ("maxDepth" in this.tilesRenderer) {
      this.tilesRenderer.maxDepth = this.optimizationSettings.detailed.maxDepth;
    }

    // CHANGE: Reset maximumMemoryUsage to default value
    if ("maximumMemoryUsage" in this.tilesRenderer) {
      this.tilesRenderer.maximumMemoryUsage = 3000 * 1024 * 1024; // Back to 3GB
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

                // Actually dispose the geometry
                node.geometry.dispose();

                // If the mesh has materials, dispose them too
                if (node.material) {
                  const materials = Array.isArray(node.material)
                    ? node.material
                    : [node.material];

                  materials.forEach((material) => {
                    // Dispose textures
                    if (material.map) material.map.dispose();
                    if (material.normalMap) material.normalMap.dispose();
                    if (material.specularMap) material.specularMap.dispose();
                    if (material.emissiveMap) material.emissiveMap.dispose();

                    // Dispose the material itself
                    material.dispose();
                  });
                }

                // Hide the mesh to prevent rendering
                node.visible = false;

                // Mark as disposed
                node.userData.__disposed = true;
                node.userData.__disposedAt = Date.now();

                disposedCount++;
              }
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
   * CHANGE: New method to dispose any unused resources
   */
  private disposeUnusedResources() {
    if (!this.tilesRenderer) return;

    let disposedCount = 0;

    // Dispose any resources marked for disposal but not yet disposed
    this.tilesRenderer.group.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        // Skip already fully disposed nodes
        if (node.userData && node.userData.__fullyDisposed) return;

        // Check if node is not visible or marked for disposal
        if (!node.visible || (node.userData && node.userData.__disposed)) {
          // Dispose geometry if it exists and hasn't been disposed
          if (node.geometry && !node.geometry.disposed) {
            node.geometry.dispose();
            disposedCount++;
          }

          // Dispose materials
          if (node.material) {
            const materials = Array.isArray(node.material)
              ? node.material
              : [node.material];

            materials.forEach((material) => {
              if (!material.disposed) {
                // Dispose textures
                if (material.map) material.map.dispose();
                if (material.normalMap) material.normalMap.dispose();
                if (material.specularMap) material.specularMap.dispose();
                if (material.emissiveMap) material.emissiveMap.dispose();

                // Dispose the material
                material.dispose();
                disposedCount++;
              }
            });
          }

          // Mark as fully disposed
          node.userData.__fullyDisposed = true;
        }
      }
    });

    console.log(`Disposed ${disposedCount} unused resources`);
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

    // CHANGE: Try alternative approach to encourage garbage collection
    if (!window.gc) {
      try {
        // Create and release large objects to trigger garbage collection
        const largeArrays = [];
        for (let i = 0; i < 10; i++) {
          largeArrays.push(new Array(1000000).fill(0));
        }
        // Release references to encourage garbage collection
        for (let i = 0; i < largeArrays.length; i++) {
          largeArrays[i] = null;
        }
        console.log("Attempted to encourage garbage collection");
      } catch (e) {
        console.log("Alternative GC approach failed:", e);
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
        // CHANGE: Reduced distance threshold from 1000 to 800
        if (distance > 800) {
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
              "emissiveMap", // CHANGE: Added emissive map
              "roughnessMap", // CHANGE: Added roughness map
              "metalnessMap", // CHANGE: Added metalness map
            ];

            textureProperties.forEach((prop) => {
              if (material[prop] && material[prop].image) {
                // Lower the anisotropy for distant textures
                if (material[prop].anisotropy > 1) {
                  material[prop].anisotropy = 1;
                  material[prop].needsUpdate = true;
                  modifiedTextureCount++;
                }

                // CHANGE: Also set mipmaps to lower memory usage
                material[prop].minFilter = THREE.LinearMipmapLinearFilter;
                material[prop].needsUpdate = true;

                // CHANGE: For very distant objects, reduce texture quality more dramatically
                if (distance > 1500 && material[prop].image) {
                  // Set generating mipmaps to true to reduce memory
                  material[prop].generateMipmaps = true;
                  // Use nearest filter for even more memory savings at extreme distances
                  if (distance > 2000) {
                    material[prop].minFilter = THREE.NearestFilter;
                    material[prop].magFilter = THREE.NearestFilter;
                  }
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
