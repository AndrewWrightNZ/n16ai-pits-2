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
import CameraPositioner from "../services/cameraPositionerService";
import { memoryManager } from "../services/MemoryManagementService";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Define a type for the ref
export interface TilesSceneRef {
  getTilesService: () => TilesRendererService | null;
}

/// Define props interface for TilesScene
interface TilesSceneProps {
  suppressWhiteOverlay?: boolean;
}

// Main scene component
const TilesScene = forwardRef<TilesSceneRef, TilesSceneProps>(
  function TilesScene({ suppressWhiteOverlay = false }, ref) {
    // Refs for service instances
    const tilesRendererServiceRef = useRef<TilesRendererService | null>(null);
    const cameraPositionerRef = useRef<CameraPositioner | null>(null);
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
    const [shadowOpacity, setShadowOpacity] = useState(0.9);
    const [missingTilesDetected, setMissingTilesDetected] = useState(false);
    const [sunPosition, setSunPosition] = useState<[number, number, number]>([
      100, 100, 50,
    ]);

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
      },
    } = useMapSettings();

    // R3F hooks
    const { scene, camera, gl: renderer } = useThree();

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
              tilesRenderer.errorTarget = 0.05; // Even lower error target for maximum detail
            }
            if ("maxDepth" in tilesRenderer) {
              tilesRenderer.maxDepth = 1000; // Maximum depth for most detailed tiles
            }
            if ("maximumMemoryUsage" in tilesRenderer) {
              tilesRenderer.maximumMemoryUsage = 8000 * 1024 * 1024; // 8GB
            }

            // Force aggressive tile loading to ensure completeness
            setTimeout(() => {
              if (tilesRenderer) {
                for (let i = 0; i < 5; i++) {
                  tilesRendererService.update();
                }
              }
            }, 500);

            // And again after a longer delay to catch any stragglers
            setTimeout(() => {
              if (tilesRenderer) {
                tilesRenderer.errorTarget = 0.05;
                for (let i = 0; i < 3; i++) {
                  tilesRendererService.update();
                }
                // Return to normal error level
                tilesRenderer.errorTarget = 0.1;
              }
            }, 3000);
          }

          // Reset retry counter after successful load
          tileLoadRetryCountRef.current = 0;

          if (tilesRenderer) {
            memoryManager.initialize(tilesRenderer, camera);
          } else {
            console.warn(
              "Cannot initialize memory manager: tiles renderer is null"
            );
          }
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
                if (
                  typeof window !== "undefined" &&
                  (window as any).debugTiles
                ) {
                  (window as any).debugTiles.detectMissingTiles();
                }
              }, 2000);
            }
          }
        },
      });

      // Initialize with advanced config for better tile loading
      tilesRendererService.initializeWithConfig({
        errorTarget: 0.1, // Lower error target for more detail
        maxDepth: 500, // Higher max depth for more detailed tiles
        maximumMemoryUsage: 8000 * 1024 * 1024, // 8GB
        loadSiblings: true, // Load neighboring tiles to reduce popping
        skipLevelOfDetail: false, // Don't skip LODs for more complete loading
        maxConcurrentRequests: 64, // Increase concurrent tile requests
      });

      tilesRendererServiceRef.current = tilesRendererService;

      // Create camera positioner
      const cameraPositioner = new CameraPositioner(
        camera as THREE.PerspectiveCamera,
        orbitControlsRef
      );
      cameraPositioner.setTilesRenderer(
        tilesRendererService.getTilesRenderer()
      );
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
    }, [
      camera,
      renderer,
      scene,
      currentLocation,
      tileLoadRetryCountRef.current,
    ]);

    // Update orbit controls auto-rotation
    useEffect(() => {
      if (cameraPositionerRef.current) {
        cameraPositionerRef.current.setAutoRotate(isOrbiting, 1.0);
      }
    }, [isOrbiting]);

    // Calculate sun position based on time of day
    const calculateSunPosition = (timeOfDay: Date) => {
      const hours = timeOfDay.getHours();
      const minutes = timeOfDay.getMinutes();
      const timeInHours = hours + minutes / 60;

      // Convert time to angle (0-360 degrees)
      // 6am = 0 degrees, 12pm = 90 degrees, 6pm = 180 degrees
      const angle = ((timeInHours - 6) / 12) * Math.PI;

      // Calculate sun position in a circular path
      const radius = 200; // Distance from center
      const height = 100; // Height of sun path

      // Calculate x and z based on angle
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Calculate y based on time (higher at noon)
      const y = Math.sin(angle) * height + height;

      return [x, y, z] as [number, number, number];
    };

    // Update sun position when time changes
    useEffect(() => {
      const timeOfDay = new Date(rawTimeOfDay);
      const newPosition = calculateSunPosition(timeOfDay);
      setSunPosition(newPosition);

      // Update shadow opacity based on time of day
      const hours = timeOfDay.getHours();
      const opacity = hours >= 6 && hours <= 18 ? 0.9 : 0.7;
      setShadowOpacity(opacity);
    }, [rawTimeOfDay]);

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
    const lastMemoryCheckRef = useRef<number>(0);
    const memoryCheckInterval = 5000; // Check memory every 5 seconds

    // Separate effect for tile loading optimization
    useEffect(() => {
      const interval = setInterval(() => {
        if (!tilesRendererServiceRef.current) return;

        const tilesRenderer =
          tilesRendererServiceRef.current.getTilesRenderer();
        if (!tilesRenderer) return;

        // Tile loading optimization
        if (tilesRenderer.errorTarget !== undefined) {
          const isMoving =
            orbitControlsRef.current && orbitControlsRef.current.isDragging;
          if (isMoving) {
            tilesRenderer.errorTarget = 6;
          } else if (Date.now() - lastCameraUpdateTimeRef.current > 3000) {
            tilesRenderer.errorTarget = 0.5;
          } else {
            tilesRenderer.errorTarget = 2;
          }
        }
      }, 1000); // Run every second

      return () => clearInterval(interval);
    }, []);

    // The render loop - optimized for smooth rendering
    useFrame(({ clock }) => {
      const currentTime = clock.getElapsedTime();

      // Track camera movement
      if (camera) {
        if (!lastCameraPositionForMovementRef.current) {
          lastCameraPositionForMovementRef.current = camera.position.clone();
          cameraMovementDetectedRef.current = false;
        } else {
          const distance = camera.position.distanceTo(
            lastCameraPositionForMovementRef.current
          );
          if (distance > 0.1) {
            lastCameraPositionForMovementRef.current = camera.position.clone();
            lastCameraUpdateTimeRef.current = currentTime;
            cameraMovementDetectedRef.current = true;

            if (stationaryTimerRef.current !== null) {
              clearTimeout(stationaryTimerRef.current);
              stationaryTimerRef.current = null;
            }
          } else if (
            cameraMovementDetectedRef.current &&
            stationaryTimerRef.current === null
          ) {
            stationaryTimerRef.current = setTimeout(() => {
              if (tilesRendererServiceRef.current) {
                const tilesRenderer =
                  tilesRendererServiceRef.current.getTilesRenderer();
                if (tilesRenderer && tilesRenderer.errorTarget !== undefined) {
                  if (tilesRenderer.errorTarget > 0.4) {
                    tilesRenderer.errorTarget = 0.2;
                    for (let i = 0; i < 3; i++) {
                      tilesRendererServiceRef.current.update();
                    }
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
            }, 2000) as unknown as number;
          }
        }
      }

      // Update tiles renderer
      if (tilesRendererServiceRef.current) {
        tilesRendererServiceRef.current.update();
      }

      // Memory management - check periodically
      if (currentTime - lastMemoryCheckRef.current > memoryCheckInterval) {
        if (tilesRendererServiceRef.current) {
          const tilesRenderer =
            tilesRendererServiceRef.current.getTilesRenderer();
          if (tilesRenderer && "maximumMemoryUsage" in tilesRenderer) {
            let visibleTilesCount = 0;
            tilesRenderer.group.traverse((object) => {
              if (object.visible) visibleTilesCount++;
            });

            // More aggressive memory management
            if (visibleTilesCount > 100) {
              tilesRenderer.maximumMemoryUsage = 4000 * 1024 * 1024; // 4GB
              tilesRenderer.errorTarget = 1.0; // Lower quality when many tiles
            } else if (visibleTilesCount > 50) {
              tilesRenderer.maximumMemoryUsage = 3000 * 1024 * 1024; // 3GB
              tilesRenderer.errorTarget = 0.7;
            } else {
              tilesRenderer.maximumMemoryUsage = 2000 * 1024 * 1024; // 2GB
              tilesRenderer.errorTarget = 0.5;
            }

            // Force garbage collection if memory usage is high
            if (visibleTilesCount > 150) {
              tilesRenderer.dispose();
              tilesRendererServiceRef.current.update();
            }
          }
        }
        lastMemoryCheckRef.current = currentTime;
      }
    });

    // Get the current tiles renderer for JSX
    const getCurrentTilesRenderer = (): ExtendedTilesRenderer | null => {
      return tilesRendererServiceRef.current?.getTilesRenderer() || null;
    };

    return (
      <>
        {/* Ambient light - minimal constant illumination */}
        <ambientLight intensity={0.4} color={new THREE.Color(0xffffff)} />

        {/* Directional light for shadows */}
        <directionalLight
          position={sunPosition}
          intensity={2.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={500}
          shadow-camera-left={-100}
          shadow-camera-right={100}
          shadow-camera-top={100}
          shadow-camera-bottom={-100}
        />

        {/* Add our shadow wrapper to make tiles receive shadows */}
        {tilesLoaded && !suppressWhiteOverlay && getCurrentTilesRenderer() && (
          <TilesShadowWrapper
            tilesGroup={getCurrentTilesRenderer()!.group}
            shadowOpacity={shadowOpacity}
          />
        )}

        {/* Enhanced white material with shadow overlays */}
        {tilesLoaded && !suppressWhiteOverlay && getCurrentTilesRenderer() && (
          <WhiteTilesMaterial
            tilesGroup={getCurrentTilesRenderer()!.group}
            shadowOpacity={shadowOpacity}
            enabled={true} // TODO: Add back in state management
            brightness={0.8}
            roughness={0.9}
            shadowIntensity={0.8}
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
  }
);

export default TilesScene;
