import {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
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
  toggleWhiteTiles: () => void;
}

/// Define props interface for TilesScene
interface TilesSceneProps {
  suppressWhiteOverlay?: boolean;
}

// Main scene component
const TilesScene = forwardRef<TilesSceneRef, TilesSceneProps>(
  function TilesScene(_, ref) {
    // Refs for service instances
    const tilesRendererServiceRef = useRef<TilesRendererService | null>(null);
    const cameraPositionerRef = useRef<CameraPositioner | null>(null);
    const orbitControlsRef = useRef<any>(null);

    // State
    const [tilesLoaded, setTilesLoaded] = useState(false);
    const [shadowOpacity, setShadowOpacity] = useState(0.9);
    const [sunPosition, setSunPosition] = useState<[number, number, number]>([
      100, 100, 50,
    ]);

    // Hooks
    const {
      data: {
        isOrbiting,
        timeOfDay: rawTimeOfDay,
        currentLocation,
        showWhiteTiles,
      },
      operations: {
        onSetIsLoading,
        onSetLoadingProgress,
        onSetError,
        onSetTileCount,
        onSetCopyrightInfo,
        onSetShowWhiteTiles,
      },
    } = useMapSettings();

    // R3F hooks
    const { scene, camera, gl: renderer } = useThree();

    // Calculate sun position based on time of day
    const calculateSunPosition = useCallback((timeOfDay: Date) => {
      const hours = timeOfDay.getHours();
      const minutes = timeOfDay.getMinutes();
      const timeInHours = hours + minutes / 60;
      const angle = ((timeInHours - 6) / 12) * Math.PI;
      const radius = 200;
      const height = 100;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(angle) * height + height;
      return [x, y, z] as [number, number, number];
    }, []);

    // Update white material when showWhiteTiles changes
    useEffect(() => {
      if (tilesRendererServiceRef.current) {
        tilesRendererServiceRef.current.setUseWhiteMaterial(showWhiteTiles);
      }
    }, [showWhiteTiles]);

    // Initialize 3D Tiles
    useEffect(() => {
      if (!camera || !renderer || !scene) return;

      onSetIsLoading(true);
      onSetError(null);
      setTilesLoaded(false);

      const tilesRendererService = new TilesRendererService(
        camera,
        renderer,
        scene,
        API_KEY,
        showWhiteTiles
      );

      tilesRendererService.setCallbacks({
        onLoadError: (error) =>
          onSetError(`Tiles loading error: ${error.message}`),
        onLoadProgress: (progress) => onSetLoadingProgress(progress),
        onLoadComplete: () => {
          onSetIsLoading(false);
          setTilesLoaded(true);
          const tilesRenderer = tilesRendererService.getTilesRenderer();
          if (tilesRenderer) {
            onSetTileCount(tilesRenderer.group.children.length);
            tilesRendererService.setupShadowsForTiles();
            memoryManager.initialize(tilesRenderer, camera);
          }
        },
        onAttributions: (attributions) => onSetCopyrightInfo(attributions),
        onTileCount: (count) => onSetTileCount(count),
      });

      tilesRendererService.initializeWithConfig({
        errorTarget: 0.1,
        maxDepth: 1000,
        maximumMemoryUsage: 8000 * 1024 * 1024,
        loadSiblings: true,
        skipLevelOfDetail: false,
        maxConcurrentRequests: 64,
      });

      tilesRendererServiceRef.current = tilesRendererService;

      const cameraPositioner = new CameraPositioner(
        camera as THREE.PerspectiveCamera,
        orbitControlsRef
      );
      cameraPositioner.setTilesRenderer(
        tilesRendererService.getTilesRenderer()
      );
      cameraPositionerRef.current = cameraPositioner;

      const locationData = PRESET_LOCATIONS[currentLocation];
      if (locationData) {
        cameraPositioner.positionCameraAtLocation(locationData);
      }

      return () => {
        if (tilesRendererServiceRef.current) {
          tilesRendererServiceRef.current.dispose();
          tilesRendererServiceRef.current = null;
        }
        cameraPositionerRef.current = null;
      };
    }, [camera, renderer, scene, currentLocation, showWhiteTiles]);

    // Update orbit controls auto-rotation
    useEffect(() => {
      if (cameraPositionerRef.current) {
        cameraPositionerRef.current.setAutoRotate(isOrbiting, 1.0);
      }
    }, [isOrbiting]);

    // Update sun position and shadow opacity
    useEffect(() => {
      const timeOfDay = new Date(rawTimeOfDay);
      setSunPosition(calculateSunPosition(timeOfDay));

      const hours = timeOfDay.getHours();
      setShadowOpacity(hours >= 6 && hours <= 18 ? 0.9 : 0.7);
    }, [rawTimeOfDay, calculateSunPosition]);

    // The render loop
    useFrame(() => {
      if (tilesRendererServiceRef.current) {
        tilesRendererServiceRef.current.update();
      }
    });

    // Expose the TilesRendererService and toggle function via ref
    useImperativeHandle(ref, () => ({
      getTilesService: () => tilesRendererServiceRef.current,
      toggleWhiteTiles: () => {
        onSetShowWhiteTiles(!showWhiteTiles);
        if (tilesRendererServiceRef.current) {
          tilesRendererServiceRef.current.setUseWhiteMaterial(!showWhiteTiles);
        }
      },
    }));

    // Get the current tiles renderer for JSX
    const getCurrentTilesRenderer = (): ExtendedTilesRenderer | null => {
      return tilesRendererServiceRef.current?.getTilesRenderer() || null;
    };

    return (
      <>
        <ambientLight intensity={0.9} color={new THREE.Color(0xffffff)} />
        <directionalLight
          position={sunPosition}
          intensity={2.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={1000}
          shadow-camera-left={-300}
          shadow-camera-right={300}
          shadow-camera-top={300}
          shadow-camera-bottom={-300}
        />
        {tilesLoaded && showWhiteTiles && getCurrentTilesRenderer() && (
          <WhiteTilesMaterial
            tilesGroup={getCurrentTilesRenderer()!.group}
            shadowOpacity={shadowOpacity}
            enabled={true}
            brightness={0.8}
            roughness={0.9}
            shadowIntensity={0.8}
          />
        )}
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
