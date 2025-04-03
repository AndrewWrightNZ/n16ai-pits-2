import { useRef, useEffect, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";

// Import helper classes
import {
  TilesRendererService,
  ExtendedTilesRenderer,
} from "../services/tilesRendererService";

// Import the TilesShadowWrapper component
import TilesShadowWrapper from "./TilesShadowWrapper";

// Import data
import { PRESET_LOCATIONS } from "../hooks/locationsData";

// Hooks
import useMapSettings from "../hooks/useMapSettings";
import ShadowsManager from "../services/shadowManager";
import CSMController from "../controllers/csmController";
import CameraPositioner from "../services/cameraPositionerService";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function TilesScene() {
  // Refs for service instances
  const tilesRendererServiceRef = useRef<TilesRendererService | null>(null);
  const csmControllerRef = useRef<CSMController | null>(null);
  const cameraPositionerRef = useRef<CameraPositioner | null>(null);
  const shadowsManagerRef = useRef<ShadowsManager | null>(null);
  const orbitControlsRef = useRef<any>(null);

  // State
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [shadowOpacity, setShadowOpacity] = useState(0.6);

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

  // Initialize shadow manager
  useEffect(() => {
    if (!renderer) return;

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
    const timeOfDay = new Date(rawTimeOfDay);

    // Initialize CSM
    csmController.initialize(timeOfDay);
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
  }, [camera, scene, rawTimeOfDay]);

  // Initialize 3D Tiles
  useEffect(() => {
    onSetIsLoading(true);
    onSetError(null);
    setTilesLoaded(false);

    // Create TilesRendererService
    const tilesRendererService = new TilesRendererService(
      camera,
      renderer,
      scene,
      API_KEY
    );

    // Set callbacks
    tilesRendererService.setCallbacks({
      onLoadError: (error) =>
        onSetError(`Tiles loading error: ${error.message}`),
      onLoadProgress: (progress) => onSetLoadingProgress(progress),
      onLoadComplete: () => {
        onSetIsLoading(false);
        setTilesLoaded(true);

        // Setup shadows once tiles are loaded
        tilesRendererService.setupShadowsForTiles();

        // Update tile count
        const tilesRenderer = tilesRendererService.getTilesRenderer();
        if (tilesRenderer) {
          onSetTileCount(tilesRenderer.group.children.length);
        }
      },
      onAttributions: (attributions) => onSetCopyrightInfo(attributions),
      onTileCount: (count) => onSetTileCount(count),
    });

    // Initialize the service
    tilesRendererService.initialize();
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

    // Position camera at current location
    const locationData = PRESET_LOCATIONS[currentLocation];
    if (locationData) {
      cameraPositioner.positionCameraAtLocation(locationData);
    }

    return () => {
      // Cleanup on unmount
      if (tilesRendererServiceRef.current) {
        tilesRendererServiceRef.current.dispose();
        tilesRendererServiceRef.current = null;
      }
      cameraPositionerRef.current = null;
    };
  }, [camera, renderer, scene, currentLocation]);

  // If location changes, reposition camera
  useEffect(() => {
    if (!cameraPositionerRef.current) return;

    const locationData = PRESET_LOCATIONS[currentLocation];
    if (locationData) {
      cameraPositionerRef.current.positionCameraAtLocation(locationData);
    }
  }, [currentLocation]);

  // Update orbit controls auto-rotation
  useEffect(() => {
    if (cameraPositionerRef.current) {
      cameraPositionerRef.current.setAutoRotate(isOrbiting);
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

  // The render loop
  useFrame(({ clock }) => {
    // Update tiles renderer
    if (tilesRendererServiceRef.current) {
      tilesRendererServiceRef.current.update();
    }

    // Update CSM with time and wobble
    if (csmControllerRef.current) {
      const timeOfDay = new Date(rawTimeOfDay);
      csmControllerRef.current.update(timeOfDay, clock.getElapsedTime());
    }
  });

  // Get the current tiles renderer for JSX
  const getCurrentTilesRenderer = (): ExtendedTilesRenderer | null => {
    return tilesRendererServiceRef.current?.getTilesRenderer() || null;
  };

  return (
    <>
      {/* Ambient light - reduced intensity for better shadow contrast */}
      <ambientLight intensity={0.7} color={new THREE.Color(0xffffff)} />

      {/* Add our shadow wrapper to make tiles receive shadows */}
      {tilesLoaded && getCurrentTilesRenderer() && (
        <TilesShadowWrapper
          tilesGroup={getCurrentTilesRenderer()!.group}
          shadowOpacity={shadowOpacity}
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
        maxDistance={500}
      />

      {/* Shadow-receiving ground plane at a specific height */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 60, 0]}>
        <planeGeometry args={[500, 500]} />
        <shadowMaterial transparent opacity={0.8} color={0x000000} />
      </mesh>
    </>
  );
}
