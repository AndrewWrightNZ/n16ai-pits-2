import * as THREE from "three";
import {
  BrightnessContrast,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";
import { Canvas } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";

// Hooks
import usePubAreas from "../hooks/usePubAreas";
import useMapSettings from "../../../../scene/_shared/hooks/useMapSettings";
import { useDaylightLighting } from "../../../../scene/_shared/hooks/useDaylightLighting";

// Components
import ShadowEnabledTilesScene, {
  TilesSceneRef,
} from "./ShadowEnabledTilesScene";
import CreatePubArea from "./CreatePubArea";
import DraggableLocationsModal from "./DraggableLocationsModal";
import SelectPubArea from "../../../../scene/_shared/components/SelectPubArea";
import ControlsPanel from "../../../../scene/_shared/components/ControlsPanel";
import CreatePubLabels from "../../../../pub-labels/_shared/components/CreatePubLabels";
import EnhancedMemoryMonitor from "../../../../scene/_shared/components/EnhancedMemoryMonitor";

// Types
import { Pub } from "../../../../../_shared/types";

// Types

interface SimplePhotorealisticTilesMapProps {
  pageName: string;
}

export default function SimplePhotorealisticTilesMap({
  pageName,
}: SimplePhotorealisticTilesMapProps) {
  // Ref to access TilesRendererService and camera functions
  const tilesSceneRef = useRef<TilesSceneRef>(null);

  // State for tracking camera details
  const [cameraInfo, setCameraInfo] = useState({
    position: { x: 0, y: 0, z: 0 },
    target: { x: 0, y: 0, z: 0 },
  });

  // State to control camera panel visibility
  const [showCameraPanel, setShowCameraPanel] = useState(true);

  // Hooks - only keep what's needed for loading states
  const {
    data: {
      // Loading
      isLoading,

      // View
      copyrightInfo,
    },
  } = useMapSettings();

  const {
    data: { selectedPubArea },
    operations: { onSetSelectedPub },
  } = usePubAreas();

  const { brightnessValue, vignetteDarkness, skyColor } = useDaylightLighting();

  //

  // Variables
  const hideAllOverlays = ["create-mask"].includes(pageName);

  // Function to update camera information
  const updateCameraInfo = () => {
    if (tilesSceneRef.current) {
      if (selectedPubArea) {
        const { position, target } = selectedPubArea.camera_position;

        // Use the tilesSceneRef to update the camera
        tilesSceneRef.current.setCameraPosition(position);
        tilesSceneRef.current.setCameraTarget(target);
      } else {
        const position = tilesSceneRef.current.getCameraPosition();
        const target = tilesSceneRef.current.getCameraTarget();

        if (position && target) {
          setCameraInfo({
            position: {
              x: parseFloat(position.x.toFixed(2)),
              y: parseFloat(position.y.toFixed(2)),
              z: parseFloat(position.z.toFixed(2)),
            },
            target: {
              x: parseFloat(target.x.toFixed(2)),
              y: parseFloat(target.y.toFixed(2)),
              z: parseFloat(target.z.toFixed(2)),
            },
          });
        }
      }
    }
  };

  // Update camera info at regular intervals
  useEffect(() => {
    if (selectedPubArea) {
      updateCameraInfo();
    }
  }, [selectedPubArea, isLoading]);

  // Function to jump to pub location using lat/lng
  const handleJumpToPub = (pub: Pub) => {
    if (!pub.latitude || !pub.longitude) return;

    // Store the selected pub for later use
    onSetSelectedPub(pub);

    // Show camera panel after a short delay
    setTimeout(() => {
      setShowCameraPanel(true);
    }, 1000);
  };

  return (
    <div className="relative">
      <div className="w-full h-[850px] mx-auto relative overflow-hidden">
        <Canvas
          shadows={pageName === "scene"}
          camera={{
            fov: 25,
            near: 1,
            far: 400,
            position: [0, 800, 0],
          }}
          onCreated={({ gl }) => {
            // Black background
            gl.setClearColor(new THREE.Color(skyColor));
            gl.setPixelRatio(window.devicePixelRatio);

            gl.shadowMap.enabled = pageName === "scene";
            gl.shadowMap.type =
              pageName === "scene"
                ? THREE.PCFSoftShadowMap
                : THREE.PCFShadowMap;

            // Keep the zoom for consistent view
            gl.domElement.style.transform = "scale(1.1)";
            gl.domElement.style.transformOrigin = "center center";
          }}
        >
          {/* Use the ShadowEnabledTilesScene for camera tracking */}
          <ShadowEnabledTilesScene
            ref={tilesSceneRef}
            allowShadows={pageName === "scene"}
          />

          {pageName === "scene" && (
            <EffectComposer>
              <BrightnessContrast brightness={brightnessValue} contrast={0.2} />
              {/* Slight contrast increase */}
              <Vignette
                eskil={false}
                offset={0.15}
                darkness={vignetteDarkness}
              />
            </EffectComposer>
          )}
        </Canvas>

        {pageName === "scene" && (
          <>
            <ControlsPanel />
            <SelectPubArea />
          </>
        )}

        {/* Simplified location modal with pub jumping capability */}
        {!hideAllOverlays && (
          <DraggableLocationsModal
            onJumpToPub={handleJumpToPub}
            filterType={pageName}
          />
        )}

        {!isLoading && showCameraPanel && pageName === "areas" && (
          <CreatePubArea
            cameraInfo={cameraInfo}
            tilesSceneRef={tilesSceneRef}
          />
        )}

        {!isLoading && showCameraPanel && pageName === "labels" && (
          <CreatePubLabels tilesSceneRef={tilesSceneRef} />
        )}

        {!hideAllOverlays && (
          <div className="absolute bottom-1 left-1 z-10">
            <img
              src="https://www.gstatic.com/images/branding/googlelogo/1x/googlelogo_color_68x28dp.png"
              alt="Google"
              height="20"
              className="h-5"
            />
          </div>
        )}

        {!hideAllOverlays && copyrightInfo && (
          <div className="absolute bottom-1 right-1 text-[10px] text-white bg-black/50 py-0.5 px-1 rounded-sm z-10">
            {copyrightInfo}
          </div>
        )}

        {!hideAllOverlays && <EnhancedMemoryMonitor refreshInterval={2000} />}
      </div>
    </div>
  );
}
