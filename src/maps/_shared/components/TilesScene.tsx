import {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";

// Import helper classes
import {
  TilesRendererService,
  ExtendedTilesRenderer,
} from "../services/tilesRendererService";

// Import components
import TilesShadowWrapper from "./TilesShadowWrapper";
import WhiteTilesMaterial from "./WhiteTilesMaterial";

// Import data
import { PRESET_LOCATIONS } from "../hooks/locationsData";

// Hooks
import useMapSettings from "../hooks/useMapSettings";
import ShadowsManager from "../services/shadowManager";
import CSMController from "../controllers/csmController";
import CameraPositioner from "../services/cameraPositionerService";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Define a type for the ref
export interface TilesSceneRef {
  getTilesService: () => TilesRendererService | null;
}

// Main scene component
const TilesScene = forwardRef<TilesSceneRef, {}>(function TilesScene(_, ref) {
  // Refs for service instances
  const tilesRendererServiceRef = useRef<TilesRendererService | null>(null);
  const csmControllerRef = useRef<CSMController | null>(null);
  const cameraPositionerRef = useRef<CameraPositioner | null>(null);
  const shadowsManagerRef = useRef<ShadowsManager | null>(null);
  const orbitControlsRef = useRef<any>(null);
  const shadowWrapperAppliedRef = useRef<boolean>(false);
  const tileLoadRetryCountRef = useRef<number>(0);
  const lastCameraPositionRef = useRef<THREE.Vector3 | null>(null);
  const lastCameraTargetRef = useRef<THREE.Vector3 | null>(null);

  // Expose the TilesRendererService via ref
  useImperativeHandle(ref, () => ({
    getTilesService: () => tilesRendererServiceRef.current,
  }));

  // State
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [shadowOpacity, setShadowOpacity] = useState(0.6);
  const [useWhiteMaterial, setUseWhiteMaterial] = useState(true);
  const [missingTilesDetected, setMissingTilesDetected] = useState(false);

  // Hooks
  const {
    data: {
      // View
      isOrbiting,
      timeOfDay: rawTimeOfDay,

      // Location
      currentLocation,
    },
    operations: {
      // Loading
      onSetIsLoading,
      onSetLoadingProgress,
      onSetError,
      onSetTileCount,

      // View
      onSetCopyrightInfo,
      onSetLightRef,
    },
  } = useMapSettings();

  // R3F hooks
  const { scene, camera, gl: renderer } = useThree();

  // Ground level for shadows and ground replacement
  const groundHeight = 60;

  // Debug function to add to window
  useEffect(() => {
    // Add debug functions to window for console access
    if (typeof window !== "undefined") {
      (window as any).debugTiles = {
        forceWhiteMaterials: () => {
          if (tilesRendererServiceRef.current) {
            tilesRendererServiceRef.current.forceUpdateMaterials();
          }
        },
        logTiles: () => {
          if (tilesRendererServiceRef.current) {
            const tilesRenderer =
              tilesRendererServiceRef.current.getTilesRenderer();
            if (tilesRenderer) {
              // Additional logging for tile visibility
              let visibleTiles = 0;
              tilesRenderer.group.traverse((object) => {
                if (object.visible) visibleTiles++;
              });
            }
          }
        },
        toggleWhiteMaterial: () => {
          setUseWhiteMaterial(!useWhiteMaterial);
        },
        // Add the camera position logging function
        logCameraPosition: () => {
          if (cameraPositionerRef.current) {
            cameraPositionerRef.current.logCurrentPosition();
          } else {
            console.error("Camera positioner not available");
          }
        },
        // Add tile loading optimization functions
        forceLoadVisibleTiles: () => {
          if (tilesRendererServiceRef.current) {
            const tilesRenderer =
              tilesRendererServiceRef.current.getTilesRenderer();
            if (tilesRenderer) {
              // Store original error target
              const originalErrorTarget = tilesRenderer.errorTarget || 1;

              // Set extremely low error target to force maximum detail
              tilesRenderer.errorTarget = 0.05;

              // Force update several times to ensure tiles get loaded
              for (let i = 0; i < 10; i++) {
                tilesRendererServiceRef.current.update();
              }

              // Reset error target after a delay
              setTimeout(() => {
                if (tilesRenderer) {
                  tilesRenderer.errorTarget = originalErrorTarget;
                }
              }, 5000);
            }
          }
        },
        // Set a very low error target to force maximum detail
        setHighDetail: () => {
          if (tilesRendererServiceRef.current) {
            const tilesRenderer =
              tilesRendererServiceRef.current.getTilesRenderer();
            if (tilesRenderer) {
              tilesRenderer.errorTarget = 0.2;
              if ("maximumMemoryUsage" in tilesRenderer) {
                tilesRenderer.maximumMemoryUsage = 6000 * 1024 * 1024; // Increase memory limit to 4GB
              }
              if ("maxDepth" in tilesRenderer) {
                tilesRenderer.maxDepth = 200;
              }
              tilesRendererServiceRef.current.update();
            }
          }
        },
        // Set a higher error target for performance
        setPerformanceMode: () => {
          if (tilesRendererServiceRef.current) {
            const tilesRenderer =
              tilesRendererServiceRef.current.getTilesRenderer();
            if (tilesRenderer) {
              tilesRenderer.errorTarget = 6;
              tilesRendererServiceRef.current.update();
            }
          }
        },
        // Reload the current view with optimized settings
        optimizeCurrentView: () => {
          if (tilesRendererServiceRef.current && camera) {
            const tilesRenderer =
              tilesRendererServiceRef.current.getTilesRenderer();
            if (tilesRenderer) {
              // Set a lower error target for center prioritization
              tilesRenderer.errorTarget = 0.5;

              // If the renderer has these properties, set them for optimization
              if ("maxDepth" in tilesRenderer) {
                tilesRenderer.maxDepth = 200;
              }

              if ("maximumMemoryUsage" in tilesRenderer) {
                tilesRenderer.maximumMemoryUsage = 6000 * 1024 * 1024; // Increase memory limit to 4GB
              }

              // Force multiple updates to refresh the view
              for (let i = 0; i < 5; i++) {
                tilesRendererServiceRef.current.update();
              }

              // Schedule additional updates
              setTimeout(() => {
                if (tilesRendererServiceRef.current && tilesRenderer) {
                  for (let i = 0; i < 3; i++) {
                    tilesRendererServiceRef.current.update();
                  }
                }
              }, 1000);
            }
          }
        },
        // Detect and fix missing tiles
        detectMissingTiles: () => {
          if (tilesRendererServiceRef.current) {
            const tilesRenderer =
              tilesRendererServiceRef.current.getTilesRenderer();
            if (tilesRenderer) {
              // Force load all visible tiles at maximum detail
              tilesRenderer.errorTarget = 0.05;
              if ("maxDepth" in tilesRenderer) {
                tilesRenderer.maxDepth = 200;
              }

              // Refresh the renderer multiple times
              for (let i = 0; i < 5; i++) {
                tilesRendererServiceRef.current.update();
              }

              // Schedule additional forced updates
              setTimeout(() => {
                if (tilesRendererServiceRef.current) {
                  // Lower error target even further
                  const tr = tilesRendererServiceRef.current.getTilesRenderer();
                  if (tr) {
                    tr.errorTarget = 0.02;
                    // Force update several more times
                    for (let i = 0; i < 3; i++) {
                      tilesRendererServiceRef.current.update();
                    }
                  }
                }
              }, 2000);
            }
          }
        },
        // Reload the entire tile set
        reloadTiles: () => {
          if (tilesRendererServiceRef.current) {
            // Store current camera position and target
            if (camera && orbitControlsRef.current) {
              lastCameraPositionRef.current = camera.position.clone();
              lastCameraTargetRef.current =
                orbitControlsRef.current.target.clone();
            }

            // Dispose and reload
            tilesRendererServiceRef.current.dispose();
            tilesRendererServiceRef.current = null;

            // Force re-mount by toggling state
            setTilesLoaded(false);
            tileLoadRetryCountRef.current++;

            // Reinitialize tiles with the next useEffect cycle
          }
        },
      };
    }

    return () => {
      // Remove debug functions
      if (typeof window !== "undefined") {
        (window as any).debugTiles = undefined;
      }
    };
  }, [useWhiteMaterial, camera]);

  // Initialize shadow manager
  useEffect(() => {
    if (!renderer) return;

    // Configure renderer shadow settings
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = true
      ? THREE.BasicShadowMap // Faster but lower quality
      : THREE.PCFSoftShadowMap; // Higher quality but slower

    const shadowsManager = new ShadowsManager(renderer);
    shadowsManager.initializeShadowRenderer();
    shadowsManagerRef.current = shadowsManager;

    return () => {
      shadowsManagerRef.current = null;
    };
  }, [renderer]);

  // Initialize CSM controller when time of day changes
  useEffect(() => {
    if (!camera || !scene) return;

    // Create CSM controller
    const csmController = new CSMController(
      camera as THREE.PerspectiveCamera,
      scene
    );

    // Configure CSM based on performance mode
    const shadowMapSize = 2048;
    const cascades = 2;

    // Initialize CSM with configuration
    const timeOfDay = new Date(rawTimeOfDay);
    csmController.initialize(timeOfDay, {
      shadowMapSize,
      cascades,
      maxFar: 5000,
    });

    // Provide the light reference
    const csm = csmController.getCSM();
    if (csm && csm.lights.length > 0) {
      onSetLightRef(csm.lights[0] as any);
    }

    csmControllerRef.current = csmController;

    // Update shadow opacity
    if (shadowsManagerRef.current) {
      const opacity = shadowsManagerRef.current.updateShadowOpacity(timeOfDay);
      setShadowOpacity(opacity);
    }

    return () => {
      if (csmControllerRef.current) {
        csmControllerRef.current.dispose();
        csmControllerRef.current = null;
      }
    };
  }, [camera, scene, rawTimeOfDay, onSetLightRef]);

  // Initialize 3D Tiles
  useEffect(() => {
    if (!camera || !renderer || !scene) return;

    onSetIsLoading(true);
    onSetError(null);
    setTilesLoaded(false);
    shadowWrapperAppliedRef.current = false;

    // Create TilesRendererService WITHOUT forcing white material
    // We'll use the WhiteTilesMaterial component instead
    const tilesRendererService = new TilesRendererService(
      camera,
      renderer,
      scene,
      API_KEY,
      false // Don't force white material in the service
    );

    // Set callbacks
    tilesRendererService.setCallbacks({
      onLoadError: (error) => {
        onSetError(`Tiles loading error: ${error.message}`);

        // Automatically attempt recovery for certain types of errors
        if (tileLoadRetryCountRef.current < 3) {
          setTimeout(() => {
            if (typeof window !== "undefined" && (window as any).debugTiles) {
              (window as any).debugTiles.reloadTiles();
            }
          }, 3000);
        }
      },
      onLoadProgress: (progress) => onSetLoadingProgress(progress),
      onLoadComplete: () => {
        onSetIsLoading(false);
        setTilesLoaded(true);
        setMissingTilesDetected(false);
        // Setup shadows once tiles are loaded
        tilesRendererService.setupShadowsForTiles();

        // Update tile count
        const tilesRenderer = tilesRendererService.getTilesRenderer();
        if (tilesRenderer) {
          onSetTileCount(tilesRenderer.group.children.length);

          // Apply optimization settings after loading is complete
          if (tilesRenderer.errorTarget) {
            tilesRenderer.errorTarget = 0.5; // Lower error target for more detail
          }
          if ("maxDepth" in tilesRenderer) {
            tilesRenderer.maxDepth = 200; // Higher max depth for detailed tiles
          }
          if ("maximumMemoryUsage" in tilesRenderer) {
            tilesRenderer.maximumMemoryUsage = 6000 * 1024 * 1024; // Increase memory limit to 4GB
          }

          // Force aggressive tile loading to ensure completeness
          setTimeout(() => {
            if (tilesRenderer) {
              for (let i = 0; i < 3; i++) {
                tilesRendererService.update();
              }
            }
          }, 500);

          // And again after a longer delay to catch any stragglers
          setTimeout(() => {
            if (tilesRenderer) {
              tilesRenderer.errorTarget = 0.1;
              for (let i = 0; i < 2; i++) {
                tilesRendererService.update();
              }
              // Return to normal error level
              tilesRenderer.errorTarget = 0.5;
            }
          }, 3000);
        }

        // Reset retry counter after successful load
        tileLoadRetryCountRef.current = 0;
      },
      onAttributions: (attributions) => onSetCopyrightInfo(attributions),
      onTileCount: (count) => {
        onSetTileCount(count);
        // If we have a very low count that might indicate incomplete loading
        if (count < 5 && tilesLoaded) {
          setMissingTilesDetected(true);
          // Trigger recovery only if not already retrying
          if (tileLoadRetryCountRef.current === 0) {
            setTimeout(() => {
              if (typeof window !== "undefined" && (window as any).debugTiles) {
                (window as any).debugTiles.detectMissingTiles();
              }
            }, 2000);
          }
        }
      },
    });

    // Initialize with advanced config for better tile loading
    tilesRendererService.initializeWithConfig({
      errorTarget: 0.5,
      maxDepth: 100,
      maximumMemoryUsage: 6000 * 1024 * 1024, // 4GB
      loadSiblings: true, // Load neighboring tiles to reduce popping
      skipLevelOfDetail: false, // Don't skip LODs for more complete loading
      maxConcurrentRequests: 32, // Increase concurrent tile requests
    });

    tilesRendererServiceRef.current = tilesRendererService;

    // Create camera positioner
    const cameraPositioner = new CameraPositioner(
      camera as THREE.PerspectiveCamera,
      orbitControlsRef
    );
    cameraPositioner.setTilesRenderer(tilesRendererService.getTilesRenderer());
    if (csmControllerRef.current) {
      cameraPositioner.setCSM(csmControllerRef.current.getCSM());
    }
    cameraPositionerRef.current = cameraPositioner;

    // Position camera at current location or restore previous position
    if (lastCameraPositionRef.current && lastCameraTargetRef.current) {
      // Restore previous camera position and target
      cameraPositioner.restorePosition(
        lastCameraPositionRef.current,
        lastCameraTargetRef.current
      );
      // Clear stored positions
      lastCameraPositionRef.current = null;
      lastCameraTargetRef.current = null;
    } else {
      // Use preset location
      const locationData = PRESET_LOCATIONS[currentLocation];
      if (locationData) {
        cameraPositioner.positionCameraAtLocation(locationData);
      }
    }

    return () => {
      // Cleanup on unmount
      if (tilesRendererServiceRef.current) {
        tilesRendererServiceRef.current.dispose();
        tilesRendererServiceRef.current = null;
      }
      cameraPositionerRef.current = null;
    };
  }, [camera, renderer, scene, currentLocation, tileLoadRetryCountRef.current]);

  // Update orbit controls auto-rotation
  useEffect(() => {
    if (cameraPositionerRef.current) {
      cameraPositionerRef.current.setAutoRotate(isOrbiting, 1.0);
    }
  }, [isOrbiting]);

  // Time-of-day updates
  useEffect(() => {
    // Update CSM with new time
    if (csmControllerRef.current) {
      const timeOfDay = new Date(rawTimeOfDay);
      csmControllerRef.current.update(timeOfDay);
    }

    // Update shadow opacity
    if (shadowsManagerRef.current) {
      const timeOfDay = new Date(rawTimeOfDay);
      const opacity = shadowsManagerRef.current.updateShadowOpacity(timeOfDay);
      setShadowOpacity(opacity);
    }
  }, [rawTimeOfDay]);

  // Add this new useEffect for the keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Use Ctrl+L or Command+L as shortcut for logging camera position
      if ((event.ctrlKey || event.metaKey) && event.key === "l") {
        event.preventDefault();
        if (cameraPositionerRef.current) {
          cameraPositionerRef.current.logCurrentPosition();
        }
      }

      // Add Ctrl+D shortcut for forcing high detail loading
      if ((event.ctrlKey || event.metaKey) && event.key === "d") {
        event.preventDefault();
        if (tilesRendererServiceRef.current) {
          (window as any).debugTiles.forceLoadVisibleTiles();
        }
      }

      // Add Ctrl+R shortcut for fixing missing tiles
      if ((event.ctrlKey || event.metaKey) && event.key === "r") {
        event.preventDefault();
        if (typeof window !== "undefined" && (window as any).debugTiles) {
          (window as any).debugTiles.detectMissingTiles();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cameraPositionerRef.current, tilesRendererServiceRef.current]);

  // Missing tiles detection mechanism
  useEffect(() => {
    if (!tilesLoaded || !missingTilesDetected) return;

    if (typeof window !== "undefined" && (window as any).debugTiles) {
      (window as any).debugTiles.detectMissingTiles();
    }

    // Clear the flag after taking action
    setTimeout(() => setMissingTilesDetected(false), 5000);
  }, [tilesLoaded, missingTilesDetected]);

  // Flag to track time elapsed since last camera movement
  const lastCameraUpdateTimeRef = useRef<number>(0);
  const cameraMovementDetectedRef = useRef<boolean>(false);
  const lastCameraPositionForMovementRef = useRef<THREE.Vector3 | null>(null);
  const stationaryTimerRef = useRef<number | null>(null);

  // The render loop - with improved tile loading optimization
  useFrame(({ clock }) => {
    const currentTime = clock.getElapsedTime();

    // Track camera movement
    if (camera) {
      if (!lastCameraPositionForMovementRef.current) {
        lastCameraPositionForMovementRef.current = camera.position.clone();
        cameraMovementDetectedRef.current = false;
      } else {
        // Check if camera has moved significantly
        const distance = camera.position.distanceTo(
          lastCameraPositionForMovementRef.current
        );
        if (distance > 0.1) {
          // Threshold for movement detection
          lastCameraPositionForMovementRef.current = camera.position.clone();
          lastCameraUpdateTimeRef.current = currentTime;
          cameraMovementDetectedRef.current = true;

          // Clear any pending stationary timer
          if (stationaryTimerRef.current !== null) {
            clearTimeout(stationaryTimerRef.current);
            stationaryTimerRef.current = null;
          }
        } else if (
          cameraMovementDetectedRef.current &&
          stationaryTimerRef.current === null
        ) {
          // Camera has stopped moving, schedule detail increase after a delay
          stationaryTimerRef.current = setTimeout(() => {
            if (tilesRendererServiceRef.current) {
              const tilesRenderer =
                tilesRendererServiceRef.current.getTilesRenderer();
              if (tilesRenderer && tilesRenderer.errorTarget !== undefined) {
                // Only update if not already at high detail
                if (tilesRenderer.errorTarget > 0.4) {
                  tilesRenderer.errorTarget = 0.2;

                  // Force updates in succession
                  for (let i = 0; i < 3; i++) {
                    tilesRendererServiceRef.current.update();
                  }

                  // Return to normal error after initial high-detail load
                  setTimeout(() => {
                    if (tilesRenderer) {
                      tilesRenderer.errorTarget = 0.5;
                    }
                  }, 2000);
                }
              }
            }
            cameraMovementDetectedRef.current = false;
            stationaryTimerRef.current = null;
          }, 2000) as unknown as number; // 2 seconds of no movement
        }
      }
    }

    // Update tiles renderer
    if (tilesRendererServiceRef.current) {
      // Check if camera is moving or rotating
      const isMoving =
        orbitControlsRef.current && orbitControlsRef.current.isDragging;

      // Get the tiles renderer
      const tilesRenderer = tilesRendererServiceRef.current.getTilesRenderer();
      if (tilesRenderer && tilesRenderer.errorTarget !== undefined) {
        // During movement, use higher error target for smoother navigation
        // When stationary, use lower error target for higher detail
        if (isMoving) {
          // Only update if different from current value
          if (tilesRenderer.errorTarget < 4) {
            tilesRenderer.errorTarget = 6;
          }
        } else if (currentTime - lastCameraUpdateTimeRef.current > 3) {
          // If camera hasn't moved for 3 seconds, increase detail
          // Only update if different from current value
          if (tilesRenderer.errorTarget > 1) {
            tilesRenderer.errorTarget = 0.5;
          }
        } else {
          // Intermediate state - some movement but not actively dragging
          if (
            tilesRenderer.errorTarget > 4 ||
            tilesRenderer.errorTarget < 0.4
          ) {
            tilesRenderer.errorTarget = 2;
          }
        }
      }

      // Update the renderer with dynamic memory management based on visible tiles
      if (tilesRenderer && "maximumMemoryUsage" in tilesRenderer) {
        // Count visible tiles to dynamically adjust memory limits
        let visibleTilesCount = 0;
        tilesRenderer.group.traverse((object) => {
          if (object.visible) visibleTilesCount++;
        });

        // If we have many visible tiles, increase memory limits
        if (visibleTilesCount > 100) {
          tilesRenderer.maximumMemoryUsage = 6000 * 1024 * 1024; // 5GB for many tiles
        } else if (visibleTilesCount > 50) {
          tilesRenderer.maximumMemoryUsage = 6000 * 1024 * 1024; // 4GB for moderate tiles
        } else {
          tilesRenderer.maximumMemoryUsage = 6000 * 1024 * 1024; // 3GB for fewer tiles
        }
      }

      // Update the renderer
      tilesRendererServiceRef.current.update();
    }

    // Update CSM with time and wobble
    if (csmControllerRef.current) {
      const timeOfDay = new Date(rawTimeOfDay);

      // Only update with wobble effect every few frames in performance mode
      if (true || Math.floor(clock.getElapsedTime() * 2) % 2 === 0) {
        csmControllerRef.current.update(timeOfDay, clock.getElapsedTime());
      }
    }
  });

  // Get the current tiles renderer for JSX
  const getCurrentTilesRenderer = (): ExtendedTilesRenderer | null => {
    return tilesRendererServiceRef.current?.getTilesRenderer() || null;
  };

  return (
    <>
      {/* Ambient light - adjusted intensity based on performance mode */}
      <ambientLight intensity={0.2} color={new THREE.Color(0xffffff)} />

      {/* Add our shadow wrapper to make tiles receive shadows */}
      {tilesLoaded && getCurrentTilesRenderer() && (
        <TilesShadowWrapper
          tilesGroup={getCurrentTilesRenderer()!.group}
          shadowOpacity={shadowOpacity}
        />
      )}

      {/* Enhanced white material with shadow overlays */}
      {tilesLoaded && getCurrentTilesRenderer() && (
        <WhiteTilesMaterial
          tilesGroup={getCurrentTilesRenderer()!.group}
          shadowOpacity={shadowOpacity}
          enabled={useWhiteMaterial}
          brightness={0.8}
          roughness={0.9}
          shadowIntensity={0.8}
          groundLevelY={groundHeight}
          isDebug={false}
        />
      )}

      {/* Controls (orbit, panning, etc.) */}
      <OrbitControls
        ref={orbitControlsRef}
        enableDamping
        dampingFactor={0.1}
        screenSpacePanning={false}
        maxPolarAngle={Math.PI / 2}
        minDistance={100}
        maxDistance={1000}
      />
    </>
  );
});

export default TilesScene;
