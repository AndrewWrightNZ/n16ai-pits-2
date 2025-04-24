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
    medium: 35, // Reduced from 45
    high: 50, // Reduced from 60
    critical: 65, // Reduced from 75
  };

  // CHANGE: Adjust optimization settings to be more aggressive
  private optimizationSettings = {
    aggressive: {
      errorTarget: 12, // Increased from 8
      maxDepth: 20, // Reduced from 30
      distanceThreshold: 400, // Reduced from 600
    },
    normal: {
      errorTarget: 6, // Increased from 4
      maxDepth: 30, // Reduced from 50
      distanceThreshold: 600, // Reduced from 1000
    },
    detailed: {
      errorTarget: 3, // Increased from 2
      maxDepth: 50, // Reduced from 100
      distanceThreshold: 800, // Reduced from 1500
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
   */
  private disposeDistantGeometries(distanceThreshold: number) {
    if (!this.tilesRenderer || !this.camera) return;

    let disposedCount = 0;
    let totalNodes = 0;
    let shadowNodes = 0;
    const cameraPosition = this.camera.position;

    const processNode = (node: THREE.Object3D) => {
      totalNodes++;

      // Skip already processed nodes
      if (node.userData && node.userData.__disposed) return;

      // Skip if this is a tile geometry - we want to keep these
      if (node.userData && node.userData.isTileGeometry) {
        return;
      }

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
                // Check if this is a shadow-related object
                const isShadowObject =
                  node.userData?.isShadowOverlay ||
                  node.userData?.isCSMObject ||
                  node.userData?.isShadowMap ||
                  (node.material &&
                    (node.material instanceof THREE.ShadowMaterial ||
                      (Array.isArray(node.material) &&
                        node.material.some(
                          (m) =>
                            m instanceof THREE.ShadowMaterial ||
                            m.userData?.isShadowMaterial ||
                            m.userData?.isCSMMaterial
                        )) ||
                      node.material.userData?.isShadowMaterial ||
                      node.material.userData?.isCSMMaterial));

                if (isShadowObject) {
                  shadowNodes++;

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
      }

      // Process children recursively
      node.children.forEach(processNode);
    };

    // Start processing the tiles group
    processNode(this.tilesRenderer.group);

    // Also process shadow maps from CSM
    const shadowMapsDisposed = this.disposeShadowMaps();

    console.log(`Memory cleanup stats:`, {
      totalNodes,
      shadowNodes,
      disposedCount,
      shadowMapsDisposed,
      distanceThreshold,
    });

    return disposedCount;
  }

  /**
   * Dispose shadow maps from CSM and other shadow systems
   */
  private disposeShadowMaps() {
    let disposedCount = 0;
    let totalLights = 0;
    let lightsWithShadows = 0;

    // Traverse the scene to find shadow maps
    this.tilesRenderer?.group.traverse((object) => {
      if (object instanceof THREE.Light) {
        totalLights++;

        // Check if this is a shadow-casting light
        if (object.castShadow) {
          lightsWithShadows++;

          // Optimize shadow map size based on light type and distance
          if (object.shadow) {
            // Reduce shadow map size for distant lights
            if (object.shadow.mapSize) {
              const originalSize = object.shadow.mapSize.width;
              const reducedSize = Math.max(256, originalSize / 4); // More aggressive reduction
              if (reducedSize < originalSize) {
                object.shadow.mapSize.width = reducedSize;
                object.shadow.mapSize.height = reducedSize;
                disposedCount++;
              }
            }

            // Dispose existing shadow map
            if (object.shadow.map) {
              object.shadow.map.dispose();
              object.shadow.map = null;
              disposedCount++;
            }

            // Optimize shadow camera for distant lights
            if (object.shadow.camera) {
              const camera = object.shadow.camera;
              // More aggressive frustum reduction
              camera.left *= 0.5;
              camera.right *= 0.5;
              camera.top *= 0.5;
              camera.bottom *= 0.5;
              camera.updateProjectionMatrix();
              disposedCount++;
            }
          }
        }
      }
    });

    return disposedCount;
  }

  /**
   * Optimize shadow map textures
   */
  private optimizeShadowMaps() {
    let optimizedCount = 0;
    let totalLights = 0;

    // Traverse the scene to find shadow maps
    this.tilesRenderer?.group.traverse((object) => {
      if (object instanceof THREE.Light && object.castShadow) {
        totalLights++;

        if (object.shadow) {
          // Reduce shadow map size for distant lights
          if (object.shadow.mapSize) {
            const originalSize = object.shadow.mapSize.width;
            const reducedSize = Math.max(128, originalSize / 8); // Even more aggressive reduction
            if (reducedSize < originalSize) {
              object.shadow.mapSize.width = reducedSize;
              object.shadow.mapSize.height = reducedSize;
              object.shadow.map?.dispose();
              object.shadow.map = null;
              optimizedCount++;
            }
          }

          // Optimize shadow camera for distant lights
          if (object.shadow.camera) {
            const camera = object.shadow.camera;
            // More aggressive frustum reduction
            camera.left *= 0.3;
            camera.right *= 0.3;
            camera.top *= 0.3;
            camera.bottom *= 0.3;
            camera.updateProjectionMatrix();
            optimizedCount++;
          }
        }
      }
    });

    console.log(`Shadow map optimization stats:`, {
      totalLights,
      optimizedCount,
    });

    return optimizedCount;
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

        // More aggressive distance thresholds
        if (distance > 400) {
          // Reduced from 800
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
              "emissiveMap",
              "roughnessMap",
              "metalnessMap",
            ];

            textureProperties.forEach((prop) => {
              if (material[prop] && material[prop].image) {
                // Lower the anisotropy for distant textures
                if (material[prop].anisotropy > 1) {
                  material[prop].anisotropy = 1;
                  material[prop].needsUpdate = true;
                  modifiedTextureCount++;
                }

                // Set mipmaps to lower memory usage
                material[prop].minFilter = THREE.LinearMipmapLinearFilter;
                material[prop].needsUpdate = true;

                // For very distant objects, reduce texture quality more dramatically
                if (distance > 800) {
                  // Reduced from 1500
                  // Set generating mipmaps to true to reduce memory
                  material[prop].generateMipmaps = true;
                  // Use nearest filter for even more memory savings at extreme distances
                  if (distance > 1200) {
                    // Reduced from 2000
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

    // Also optimize shadow map textures
    const shadowMapsOptimized = this.optimizeShadowMaps();

    console.log(`Texture optimization stats:`, {
      modifiedTextureCount,
      shadowMapsOptimized,
    });

    return modifiedTextureCount;
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
}

// Create a singleton instance for use throughout the application
export const memoryManager = new MemoryManagementService();

// Type definition for window.gc
declare global {
  interface Window {
    gc?: () => void;
  }
}
