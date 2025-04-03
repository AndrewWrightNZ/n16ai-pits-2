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

// Define a type for the ref
export interface TilesSceneRef {
  getTilesService: () => TilesRendererService | null;
}

// Create a separate component for the Debug UI that sits outside the Canvas
export function TilesDebugUI({ tilesService }: any) {
  const [lastDebugAction, setLastDebugAction] = useState("");

  // Debug functions
  const forceWhiteMaterials = () => {
    if (tilesService.current) {
      tilesService.current.forceUpdateMaterials();
      setLastDebugAction("Forced white materials");
    }
  };

  const logTiles = () => {
    if (tilesService.current) {
      const tilesRenderer = tilesService.current.getTilesRenderer();
      if (tilesRenderer) {
        console.log("Tiles group:", tilesRenderer.group);
        const childCount = tilesRenderer.group.children.length;
        console.log(`Group has ${childCount} children`);
        setLastDebugAction(`Logged ${childCount} tiles`);
      }
    }
  };

  const sceneInfo = () => {
    if (!tilesService.current) return;

    const tilesRenderer = tilesService.current.getTilesRenderer();
    if (!tilesRenderer || !tilesRenderer.group) return;

    console.log("Tiles group:", tilesRenderer.group);
    let meshCount = 0;
    let materialCount = 0;
    let whiteMatCount = 0;

    tilesRenderer.group.traverse((obj: any) => {
      if (obj instanceof THREE.Mesh) {
        meshCount++;

        const materials = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];

        materialCount += materials.length;

        materials.forEach((mat) => {
          if (
            mat instanceof THREE.MeshStandardMaterial &&
            mat.color &&
            mat.color.r > 0.95 &&
            mat.color.g > 0.95 &&
            mat.color.b > 0.95
          ) {
            whiteMatCount++;
          }
        });
      }
    });

    console.log(
      `Tiles have ${meshCount} meshes, ${materialCount} materials, ${whiteMatCount} white materials`
    );
    setLastDebugAction(`Counted ${whiteMatCount} white materials`);
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        left: 10,
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: "10px",
        borderRadius: "5px",
        color: "white",
        fontFamily: "monospace",
        fontSize: "12px",
      }}
    >
      <div>Last Action: {lastDebugAction || "None"}</div>
      <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
        <button
          onClick={forceWhiteMaterials}
          style={{
            padding: "5px",
            backgroundColor: "#444",
            border: "none",
            color: "white",
            borderRadius: "3px",
          }}
        >
          Force White
        </button>
        <button
          onClick={logTiles}
          style={{
            padding: "5px",
            backgroundColor: "#444",
            border: "none",
            color: "white",
            borderRadius: "3px",
          }}
        >
          Log Tiles
        </button>
        <button
          onClick={sceneInfo}
          style={{
            padding: "5px",
            backgroundColor: "#444",
            border: "none",
            color: "white",
            borderRadius: "3px",
          }}
        >
          Count Materials
        </button>
      </div>
    </div>
  );
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
        sceneInfo: () => {
          if (tilesRendererServiceRef.current) {
            const tilesRenderer =
              tilesRendererServiceRef.current.getTilesRenderer();
            if (tilesRenderer && tilesRenderer.group) {
              let meshCount = 0;
              let materialCount = 0;
              let whiteMatCount = 0;

              tilesRenderer.group.traverse((obj) => {
                if (obj instanceof THREE.Mesh) {
                  meshCount++;

                  const materials = Array.isArray(obj.material)
                    ? obj.material
                    : [obj.material];

                  materialCount += materials.length;

                  materials.forEach((mat) => {
                    if (
                      mat instanceof THREE.MeshStandardMaterial &&
                      mat.color &&
                      mat.color.r > 0.95 &&
                      mat.color.g > 0.95 &&
                      mat.color.b > 0.95
                    ) {
                      whiteMatCount++;
                    }
                  });
                }
              });

              console.log(
                `Scene has ${meshCount} meshes, ${materialCount} materials, ${whiteMatCount} white materials`
              );
            }
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
  }, []);

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
    shadowWrapperAppliedRef.current = false;

    console.log("Initializing TilesRendererService with white materials");

    // Create TilesRendererService - explicitly use white material
    const tilesRendererService = new TilesRendererService(
      camera,
      renderer,
      scene,
      API_KEY,
      true // Force white material
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

        // Force material update after a short delay
        setTimeout(() => {
          tilesRendererService.forceUpdateMaterials();
        }, 500);

        // And again after shadow wrapper may have been applied
        setTimeout(() => {
          console.log("Second forced update for materials");
          tilesRendererService.forceUpdateMaterials();
        }, 2000);
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

  // After TilesShadowWrapper is applied, we need to re-apply white materials
  useEffect(() => {
    if (
      tilesLoaded &&
      tilesRendererServiceRef.current &&
      !shadowWrapperAppliedRef.current
    ) {
      console.log("Shadow wrapper applied, forcing material update");

      // Mark as applied to prevent multiple updates
      shadowWrapperAppliedRef.current = true;

      // Wait a short time for the shadow wrapper to complete
      setTimeout(() => {
        if (tilesRendererServiceRef.current) {
          tilesRendererServiceRef.current.forceUpdateMaterials();
        }
      }, 1000);
    }
  }, [tilesLoaded]);

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
});

export default TilesScene;
