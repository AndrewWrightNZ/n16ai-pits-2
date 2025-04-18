import * as THREE from "three";
import { useEffect, useRef } from "react";
import {
  EffectComposer,
  Vignette,
  BrightnessContrast,
} from "@react-three/postprocessing";
import { Canvas } from "@react-three/fiber";

// Components
import TilesScene, { TilesSceneRef } from "./_shared/components/TilesScene";
import ControlsPanel from "./_shared/components/ControlsPanel";

// Hooks
import useMapSettings from "./_shared/hooks/useMapSettings";
import { useDaylightLighting } from "./_shared/hooks/useDaylightLighting";
import EnhancedMemoryMonitor from "./_shared/components/EnhancedMemoryMonitor";

export default function PhotorealisticTilesMap() {
  // Ref to access TilesRendererService
  const tilesSceneRef = useRef<TilesSceneRef>(null);

  // Hooks
  const {
    data: {
      // Loading
      isLoading,
      loadingProgress,

      error,
      tileCount,

      timeOfDay,

      // View
      copyrightInfo,
      timeSpeed,
    },
    operations: { onSetTimeOfDay },
  } = useMapSettings();

  const setSpecificTime = (hours: number, minutes: number = 0) => {
    const d = new Date();
    d.setHours(hours, minutes, 0);
    onSetTimeOfDay(d);
  };

  // Animate time
  useEffect(() => {
    if (timeSpeed === 0) return;
    const handle = setInterval(() => {
      const next = new Date(timeOfDay);

      next.setMinutes(next.getMinutes() + timeSpeed * 5);

      onSetTimeOfDay(next);
    }, 1000);
    return () => clearInterval(handle);
  }, [timeSpeed]);

  // Use the custom lighting hook
  const { brightnessValue, vignetteDarkness, skyColor } = useDaylightLighting();

  return (
    <div className="relative">
      {/* Modified container size to be smaller and focus on center */}
      <div className="w-full h-[850px] mx-auto relative overflow-hidden">
        <Canvas
          shadows
          camera={{
            fov: 25, // Narrower field of view to focus more on center
            near: 1,
            far: 400, // Reduced far plane to focus on closer objects
            position: [0, 800, 0], // Lower height for closer view
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(new THREE.Color(skyColor));
            gl.setPixelRatio(window.devicePixelRatio);
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;

            // Add a small zoom to focus on center
            gl.domElement.style.transform = "scale(1.1)";
            gl.domElement.style.transformOrigin = "center center";
          }}
        >
          {/* TilesScene with integrated CSM - now with ref forwarding */}
          <TilesScene ref={tilesSceneRef} />

          <EffectComposer>
            <BrightnessContrast brightness={brightnessValue} contrast={0.15} />
            {/* Slight contrast increase */}
            <Vignette eskil={false} offset={0.15} darkness={vignetteDarkness} />
          </EffectComposer>
        </Canvas>

        {/* Controls panel (pick times, location, etc.) */}
        <ControlsPanel onSetSpecificTime={setSpecificTime} />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex flex-col justify-center items-center text-white z-50">
            <div>Loading 3D Tiles... {loadingProgress}%</div>
            <div className="w-52 h-2.5 bg-gray-700 mt-2.5 rounded-md overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 bg-black/70 flex justify-center items-center text-white p-5 text-center z-50">
            <div>
              <h3 className="text-xl font-bold mb-2">Error</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Tile count */}
        {!isLoading && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white bg-black/50 py-1 px-2.5 rounded text-xs z-10">
            {tileCount > 0
              ? `Tiles loaded: ${tileCount}`
              : "No tiles visible - try resetting view"}
          </div>
        )}

        {/* Google branding + attributions */}
        <div className="absolute bottom-1 left-1 z-10">
          <img
            src="https://www.gstatic.com/images/branding/googlelogo/1x/googlelogo_color_68x28dp.png"
            alt="Google"
            height="20"
            className="h-5"
          />
        </div>

        {copyrightInfo && (
          <div className="absolute bottom-1 right-1 text-[10px] text-white bg-black/50 py-0.5 px-1 rounded-sm z-10">
            {copyrightInfo}
          </div>
        )}

        <EnhancedMemoryMonitor refreshInterval={2000} />
      </div>
    </div>
  );
}
