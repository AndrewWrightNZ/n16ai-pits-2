import {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";

// Services
import { TilesRendererService } from "../../../../maps/_shared/services/tilesRendererService";
import CameraPositioner from "../../../../maps/_shared/services/cameraPositionerService";
import useMapSettings from "../../../../maps/_shared/hooks/useMapSettings";

// Hooks
import usePubAreas from "../hooks/usePubAreas";

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
}

// Main scene component
const EnhancedTilesScene = forwardRef<TilesSceneRef>(
  function TilesScene(_, ref) {
    // Refs for service instances
    const tilesRendererServiceRef = useRef<TilesRendererService | null>(null);
    const cameraPositionerRef = useRef<CameraPositioner | null>(null);
    const orbitControlsRef = useRef<any>(null);
    const lastCameraStateRef = useRef<{
      position: THREE.Vector3;
      target: THREE.Vector3;
      rotation: THREE.Euler;
    } | null>(null);

    // Expose the TilesRendererService and camera tracking methods via ref
    useImperativeHandle(ref, () => ({
      getTilesService: () => tilesRendererServiceRef.current,
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

    // Hooks
    const {
      data: {
        // View
        isOrbiting,
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

        // You could call an external callback here if needed
        // onCameraChanged({ position: newPosition, target: newTarget });
      }
    }, []);

    // Initialize 3D Tiles
    useEffect(() => {
      if (!camera || !renderer || !scene) return;

      onSetIsLoading(true);
      onSetError(null);

      // Create TilesRendererService without any material modifications
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
        },
        onLoadProgress: (progress) => onSetLoadingProgress(progress),
        onLoadComplete: () => {
          onSetIsLoading(false);

          // Update tile count
          const tilesRenderer = tilesRendererService.getTilesRenderer();
          if (tilesRenderer) {
            onSetTileCount(tilesRenderer.group.children.length);

            // Apply balanced settings - prioritize performance
            if (tilesRenderer.errorTarget) {
              tilesRenderer.errorTarget = 1.0; // Higher error target = less detail but better performance
            }
            if ("maxDepth" in tilesRenderer) {
              tilesRenderer.maxDepth = 100; // Lower max depth for performance
            }
            if ("maximumMemoryUsage" in tilesRenderer) {
              tilesRenderer.maximumMemoryUsage = 4000 * 1024 * 1024; // 4GB - moderate memory limit
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
        errorTarget: 0.2,
        maxDepth: 200, // Reduced depth
        maximumMemoryUsage: 4000 * 1024 * 1024, // 4GB
        loadSiblings: false, // Don't load neighboring tiles for performance
        skipLevelOfDetail: true, // Skip LODs for better performance
        maxConcurrentRequests: 16, // Fewer concurrent requests
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
        const tilesRenderer =
          tilesRendererServiceRef.current.getTilesRenderer();
        if (tilesRenderer && tilesRenderer.errorTarget !== undefined) {
          // Simple error target adjustment based on movement
          tilesRenderer.errorTarget = isMoving ? 8.0 : 2.0;
        }

        // Update the renderer
        tilesRendererServiceRef.current.update();
      }
    });

    return (
      <>
        {/* Simple lighting for better visibility */}
        <ambientLight intensity={0.7} color={new THREE.Color(0xffffff)} />
        <directionalLight intensity={0.8} position={[1, 1, 1]} />

        {/* Controls (orbit, panning, etc.) */}
        <OrbitControls
          ref={orbitControlsRef}
          enableDamping
          dampingFactor={0.1}
          screenSpacePanning={false}
          maxPolarAngle={Math.PI / 2}
          minDistance={100}
          maxDistance={1000}
          onChange={handleCameraChange} // This triggers whenever the controls are used
        />
      </>
    );
  }
);

export default EnhancedTilesScene;
