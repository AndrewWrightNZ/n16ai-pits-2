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
// import MultiLayerGround from "./";

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

  // Expose the TilesRendererService via ref
  useImperativeHandle(ref, () => ({
    getTilesService: () => tilesRendererServiceRef.current,
  }));

  // State
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [shadowOpacity, setShadowOpacity] = useState(0.6);
  const [useWhiteMaterial, setUseWhiteMaterial] = useState(true);

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
              console.log("Tiles group:", tilesRenderer.group);
              console.log(
                `Group has ${tilesRenderer.group.children.length} children`
              );
            }
          }
        },
        toggleWhiteMaterial: () => {
          setUseWhiteMaterial(!useWhiteMaterial);
        },
      };
    }

    return () => {
      // Remove debug functions
      if (typeof window !== "undefined") {
        (window as any).debugTiles = undefined;
      }
    };
  }, [useWhiteMaterial]);

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
    const shadowMapSize = true ? 2048 : 4096;
    const cascades = true ? 2 : 3;

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
      onLoadError: (error) =>
        onSetError(`Tiles loading error: ${error.message}`),
      onLoadProgress: (progress) => onSetLoadingProgress(progress),
      onLoadComplete: () => {
        onSetIsLoading(false);
        setTilesLoaded(true);

        // Log completion
        console.log("Tiles loading complete, setting up shadows");

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

  // The render loop
  useFrame(({ clock }) => {
    // Update tiles renderer
    if (tilesRendererServiceRef.current) {
      tilesRendererServiceRef.current.update();
    }

    // Update CSM with time and wobble
    if (csmControllerRef.current) {
      const timeOfDay = new Date(rawTimeOfDay);

      // Only update with wobble effect every few frames in performance mode
      if (true || Math.floor(clock.getElapsedTime() * 2) % 2 === 0) {
        csmControllerRef.current.update(timeOfDay, clock.getElapsedTime());

        // AW TODO - Change this to only render if the camera moves?
      }
    }
  });

  // Inside the TilesScene component:

  // Replace/update the useEffect where you define window.debugTiles
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
              console.log("Tiles group:", tilesRenderer.group);
              console.log(
                `Group has ${tilesRenderer.group.children.length} children`
              );
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
      };
    }

    return () => {
      // Remove debug functions
      if (typeof window !== "undefined") {
        (window as any).debugTiles = undefined;
      }
    };
  }, [useWhiteMaterial]);

  // Add this new useEffect for the keyboard shortcut (can be placed after your other useEffect hooks)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Use Ctrl+L or Command+L as shortcut
      if ((event.ctrlKey || event.metaKey) && event.key === "l") {
        event.preventDefault();
        if (cameraPositionerRef.current) {
          cameraPositionerRef.current.logCurrentPosition();
          console.log("Camera position logged via keyboard shortcut (Ctrl+L)");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cameraPositionerRef.current]);

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
