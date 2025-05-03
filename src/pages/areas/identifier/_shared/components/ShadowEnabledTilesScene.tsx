import {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useState,
} from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";

// Services
import {
  ExtendedTilesRenderer,
  TilesRendererService,
} from "../../../../scene/_shared/services/tilesRendererService";
import CameraPositioner from "../../../../scene/_shared/services/cameraPositionerService";
import { memoryManager } from "../../../../scene/_shared/services/MemoryManagementService";

// Hooks
import usePubAreas from "../../../../../_shared/hooks/pubAreas/usePubAreas";
import useMapSettings from "../../../../scene/_shared/hooks/useMapSettings";

// Components
import WhiteTilesMaterial from "../../../../scene/_shared/components/WhiteTilesMaterial";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Define a type for the ref with enhanced camera tracking and control functionality
export interface TilesSceneRef {
  getTilesService: () => TilesRendererService | null;
  getCameraPosition: () => THREE.Vector3 | null;
  getCameraTarget: () => THREE.Vector3 | null;
  getCameraRotation: () => THREE.Euler | null;
  saveCameraState: () => {
    position: THREE.Vector3;
    target: THREE.Vector3;
    rotation: THREE.Euler;
  } | null;
  // New methods for camera control
  setCameraPosition: (position: { x: number; y: number; z: number }) => void;
  setCameraTarget: (target: { x: number; y: number; z: number }) => void;
  toggleWhiteTiles?: () => void;
}

// Main scene component
interface EnhancedTilesSceneProps {
  allowShadows?: boolean;
}

const ShadowEnabledTilesScene = forwardRef<
  TilesSceneRef,
  EnhancedTilesSceneProps
>(function TilesScene({ allowShadows }, ref) {
  //

  // State
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [shadowOpacity, setShadowOpacity] = useState(0.9);
  const [northOffset, setNorthOffset] = useState(1.5); // Offset angle in radians
  const [heightOffset, setHeightOffset] = useState(-30); // Height offset in units
  const [sunPosition, setSunPosition] = useState<[number, number, number]>([
    100, 100, 50,
  ]);

  const allowFineTunedControls = false;

  // Refs for service instances
  const tilesRendererServiceRef = useRef<TilesRendererService | null>(null);
  const cameraPositionerRef = useRef<CameraPositioner | null>(null);
  const orbitControlsRef = useRef<any>(null);
  const lastCameraStateRef = useRef<{
    position: THREE.Vector3;
    target: THREE.Vector3;
    rotation: THREE.Euler;
  } | null>(null);

  // Hooks
  const {
    data: {
      // View
      isOrbiting,
      timeOfDay: rawTimeOfDay,

      showWhiteTiles,
    },
    operations: {
      // Loading
      onSetIsLoading,
      onSetLoadingProgress,
      onSetError,
      onSetTileCount,

      onSetShowWhiteTiles,

      // View
      onSetCopyrightInfo,
    },
  } = useMapSettings();

  // Ensure showWhiteTiles is false if allowShadows is false
  useEffect(() => {
    if (showWhiteTiles && !allowShadows) {
      onSetShowWhiteTiles(false);
    } else if (!showWhiteTiles && allowShadows) {
      onSetShowWhiteTiles(true);
    }
  }, [allowShadows, showWhiteTiles, onSetShowWhiteTiles]);

  // Calculate sun position based on time of day with north offset adjustment and seasonal variations
  const calculateSunPosition = useCallback(
    (timeOfDay: Date) => {
      const hours = timeOfDay.getHours();
      const minutes = timeOfDay.getMinutes();
      const timeInHours = hours + minutes / 60;
      const angle = ((timeInHours - 6) / 12) * Math.PI;

      // Apply the north offset to the angle
      const adjustedAngle = angle + northOffset;

      // Calculate seasonal adjustment for sun height
      // Day of year (0-365)
      const start = new Date(timeOfDay.getFullYear(), 0, 0);
      const diff = timeOfDay.getTime() - start.getTime();
      const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

      // Seasonal adjustment - peaks at summer solstice (~day 172) and lowest at winter solstice (~day 355)
      // This creates a sinusoidal variation throughout the year
      const seasonalFactor = Math.sin(((dayOfYear - 80) / 365) * 2 * Math.PI);

      // Apply seasonal adjustment to height
      const baseHeight = 100;
      const seasonalHeightVariation = 30; // How much the height varies by season
      const adjustedHeight =
        baseHeight + seasonalFactor * seasonalHeightVariation;

      // Apply seasonal adjustment to radius (sun's path is wider in winter, narrower in summer)
      const baseRadius = 200;
      const seasonalRadiusVariation = 20;
      const adjustedRadius =
        baseRadius - seasonalFactor * seasonalRadiusVariation;

      // Calculate position
      const x = Math.cos(adjustedAngle) * adjustedRadius;
      const z = Math.sin(adjustedAngle) * adjustedRadius;

      // Apply height offset to the sun's vertical position
      const calculatedHeight =
        Math.sin(angle) * adjustedHeight + adjustedHeight;
      const y = calculatedHeight + heightOffset; // Apply manual height offset

      return [x, y, z] as [number, number, number];
    },
    [northOffset, heightOffset]
  );

  const {
    data: { selectedPub },
  } = usePubAreas();

  // R3F hooks
  const { scene, camera, gl: renderer } = useThree();

  const cameraRef = useRef(camera);

  // Keep camera ref updated
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  // Handle keyboard events for adjusting north offset and height offset
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!allowFineTunedControls) return;

      // Adjust north offset with W/S keys
      if (event.key.toLowerCase() === "w") {
        console.log("W pressed");
        setNorthOffset((prev) => prev + 0.1); // Increase by 0.1 radians (approx. 5.7 degrees)
      } else if (event.key.toLowerCase() === "s") {
        console.log("S pressed");
        setNorthOffset((prev) => prev - 0.1); // Decrease by 0.1 radians
      }

      // Adjust height offset with E/D keys
      else if (event.key.toLowerCase() === "e") {
        console.log("E pressed");
        setHeightOffset((prev) => prev + 10); // Increase height by 10 units
      } else if (event.key.toLowerCase() === "d") {
        console.log("D pressed");
        setHeightOffset((prev) => prev - 10); // Decrease height by 10 units
      }
    };

    // Add event listener
    window.addEventListener("keydown", handleKeyDown);

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  console.log("North offset: ", northOffset);
  console.log("Height offset: ", heightOffset);

  // Callback for handling camera movement events
  const handleCameraChange = useCallback(() => {
    if (cameraRef.current && orbitControlsRef.current) {
      const newPosition = cameraRef.current.position.clone();
      const newTarget = orbitControlsRef.current.target.clone();

      // Update last camera state
      lastCameraStateRef.current = {
        position: newPosition,
        target: newTarget,
        rotation: cameraRef.current.rotation.clone(),
      };
    }
  }, []);

  // Update sun position and shadow opacity
  useEffect(() => {
    const timeOfDay = new Date(rawTimeOfDay);
    setSunPosition(calculateSunPosition(timeOfDay));

    const hours = timeOfDay.getHours();
    setShadowOpacity(hours >= 6 && hours <= 18 ? 0.9 : 0.7);
  }, [rawTimeOfDay, calculateSunPosition]);

  // Update white material when showWhiteTiles changes
  useEffect(() => {
    if (tilesRendererServiceRef.current) {
      if (showWhiteTiles && allowShadows) {
        tilesRendererServiceRef.current.setUseWhiteMaterial(true);
      } else {
        tilesRendererServiceRef.current.setUseWhiteMaterial(false);
      }
    }
  }, [showWhiteTiles, allowShadows]);

  // Initialize 3D Tiles
  useEffect(() => {
    if (!camera || !renderer || !scene) return;

    onSetIsLoading(true);
    onSetError(null);
    setTilesLoaded(false);

    // Create TilesRendererService without any material modifications
    const tilesRendererService = new TilesRendererService(
      camera,
      renderer,
      scene,
      API_KEY,
      showWhiteTiles
    );

    // Set callbacks
    tilesRendererService.setCallbacks({
      onLoadError: (error) => {
        onSetError(`Tiles loading error: ${error.message}`);
      },
      onLoadProgress: (progress) => onSetLoadingProgress(progress),
      onLoadComplete: () => {
        onSetIsLoading(false);

        // Update tile count
        const tilesRenderer = tilesRendererService.getTilesRenderer();
        if (tilesRenderer) {
          onSetTileCount(tilesRenderer.group.children.length);

          setTilesLoaded(true);

          if (tilesRenderer) {
            memoryManager.initialize(tilesRenderer, camera);
            if (allowShadows) {
              tilesRendererService.setupShadowsForTiles();
            }
          }
        }
      },
      onAttributions: (attributions) => onSetCopyrightInfo(attributions),
      onTileCount: (count) => {
        onSetTileCount(count);
      },
    });

    // Initialize with performance-focused config
    tilesRendererService.initializeWithConfig({
      errorTarget: 0.1,
      maxDepth: 1000,
      maximumMemoryUsage: 8000 * 1024 * 1024,
      loadSiblings: true,
      skipLevelOfDetail: false,
      maxConcurrentRequests: 64,
    });
    tilesRendererServiceRef.current = tilesRendererService;

    // Create camera positioner
    const cameraPositioner = new CameraPositioner(
      camera as THREE.PerspectiveCamera,
      orbitControlsRef
    );
    cameraPositioner.setTilesRenderer(tilesRendererService.getTilesRenderer());
    cameraPositionerRef.current = cameraPositioner;

    const newLocationsData = {
      altitude: 250,
      heading: 0,
      lat: selectedPub?.latitude || 0,
      lng: selectedPub?.longitude || 0,
    };

    if (newLocationsData) {
      cameraPositioner.positionCameraAtLocation(newLocationsData);

      // Initial camera state after positioning
      setTimeout(() => {
        handleCameraChange();
      }, 100);
    }

    return () => {
      // Cleanup on unmount
      if (tilesRendererServiceRef.current) {
        tilesRendererServiceRef.current.dispose();
        tilesRendererServiceRef.current = null;
      }
      cameraPositionerRef.current = null;
    };
  }, [camera, renderer, scene, selectedPub, handleCameraChange]);

  // Update orbit controls auto-rotation
  useEffect(() => {
    if (cameraPositionerRef.current) {
      cameraPositionerRef.current.setAutoRotate(isOrbiting, 1.0);
    }
  }, [isOrbiting]);

  // Simplified update loop without all the dynamic error adjustments
  useFrame(() => {
    // Simple update for tiles renderer
    if (tilesRendererServiceRef.current) {
      // Check if camera is moving or rotating
      const isMoving =
        orbitControlsRef.current && orbitControlsRef.current.isDragging;

      // Get the tiles renderer
      const tilesRenderer = tilesRendererServiceRef.current.getTilesRenderer();
      if (tilesRenderer && tilesRenderer.errorTarget !== undefined) {
        // Simple error target adjustment based on movement
        tilesRenderer.errorTarget = isMoving ? 8.0 : 2.0;
      }

      // Update the renderer
      tilesRendererServiceRef.current.update();
    }
  });

  // Get the current tiles renderer for JSX
  const getCurrentTilesRenderer = (): ExtendedTilesRenderer | null => {
    return tilesRendererServiceRef.current?.getTilesRenderer() || null;
  };

  // Expose the TilesRendererService and camera tracking methods via ref
  useImperativeHandle(ref, () => ({
    getTilesService: () => tilesRendererServiceRef.current,
    toggleWhiteTiles: () => {
      onSetShowWhiteTiles(!showWhiteTiles);
      if (tilesRendererServiceRef.current) {
        if (!showWhiteTiles && allowShadows) {
          tilesRendererServiceRef.current.setUseWhiteMaterial(true);
        } else {
          tilesRendererServiceRef.current.setUseWhiteMaterial(false);
        }
      }
    },
    getCameraPosition: () => {
      const camera = cameraRef.current;
      return camera ? camera.position.clone() : null;
    },
    getCameraTarget: () => {
      const controls = orbitControlsRef.current;
      return controls && controls.target ? controls.target.clone() : null;
    },
    getCameraRotation: () => {
      const camera = cameraRef.current;
      return camera ? camera.rotation.clone() : null;
    },
    saveCameraState: () => {
      const camera = cameraRef.current;
      const controls = orbitControlsRef.current;

      if (!camera || !controls) return null;

      const state = {
        position: camera.position.clone(),
        target: controls.target.clone(),
        rotation: camera.rotation.clone(),
      };

      lastCameraStateRef.current = state;
      return state;
    },
    // New methods for camera control
    setCameraPosition: (position) => {
      const camera = cameraRef.current;
      if (camera) {
        camera.position.set(position.x, position.y, position.z);
        // Update the camera state reference
        if (lastCameraStateRef.current) {
          lastCameraStateRef.current.position = camera.position.clone();
        }
        // Update controls if needed
        if (orbitControlsRef.current) {
          orbitControlsRef.current.update();
        }
      }
    },
    setCameraTarget: (target) => {
      const controls = orbitControlsRef.current;
      if (controls && controls.target) {
        controls.target.set(target.x, target.y, target.z);
        // Update the camera state reference
        if (lastCameraStateRef.current) {
          lastCameraStateRef.current.target = controls.target.clone();
        }
        // Update the controls
        controls.update();
      }
    },
  }));

  const showWhiteMaterial =
    tilesLoaded && showWhiteTiles && allowShadows && getCurrentTilesRenderer();

  return (
    <>
      {/* Simple lighting for better visibility */}
      <ambientLight intensity={0.3} color={new THREE.Color(0xffffff)} />
      <directionalLight
        position={sunPosition}
        intensity={4.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={1000}
        shadow-camera-left={-300}
        shadow-camera-right={300}
        shadow-camera-top={300}
        shadow-camera-bottom={-300}
      />

      {showWhiteMaterial && (
        <WhiteTilesMaterial
          tilesGroup={getCurrentTilesRenderer()!.group}
          shadowOpacity={shadowOpacity}
          enabled={true}
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
        onChange={handleCameraChange}
      />
    </>
  );
});

export default ShadowEnabledTilesScene;
