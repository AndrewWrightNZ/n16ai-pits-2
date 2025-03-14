import * as THREE from "three";
import {
  EffectComposer,
  Vignette,
  BrightnessContrast,
} from "@react-three/postprocessing";
import { Canvas } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";

// Components
import TilesScene from "./_shared/components/TilesScene";
import ControlsPanel from "./_shared/components/ControlsPanel";

// Hooks
import useMapSettings from "./_shared/hooks/useMapSettings";
import { useDaylightLighting } from "./_shared/hooks/useDaylightLighting";

export default function PhotorealisticTilesMap() {
  //

  // Hooks
  const {
    data: {
      // Loading
      isLoading,
      loadingProgress,

      error,
      tileCount,

      // View
      isOrbiting,
      copyrightInfo,
      timeSpeed,

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
      onSetIsOrbiting,
      onSetCopyrightInfo,
      onSetTimeSpeed,

      // Location
      onSetCurrentLocation,
    },
  } = useMapSettings();

  //

  // State
  const [timeOfDay, setTimeOfDay] = useState<Date>(new Date());

  const setSpecificTime = (hours: number, minutes: number = 0) => {
    const d = new Date();
    d.setHours(hours, minutes, 0);
    setTimeOfDay(d);
  };

  // Animate time
  useEffect(() => {
    if (timeSpeed === 0) return;
    const handle = setInterval(() => {
      setTimeOfDay((prev) => {
        const next = new Date(prev);
        next.setMinutes(next.getMinutes() + timeSpeed * 5);
        return next;
      });
    }, 1000);
    return () => clearInterval(handle);
  }, [timeSpeed]);

  // Use the custom lighting hook
  const { brightnessValue, vignetteDarkness, skyColor } =
    useDaylightLighting(timeOfDay);

  const formattedTime = timeOfDay.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Show/hide a directional-light shadow helper
  const [showShadowHelper, setShowShadowHelper] = useState<boolean>(false);

  // Reference to the directional light from TilesScene (optionally)
  const directionalLightRef =
    useRef<React.RefObject<THREE.DirectionalLight>>(null);
  const setLightRef = (ref: React.RefObject<THREE.DirectionalLight>) => {
    directionalLightRef.current = ref;
  };

  return (
    <div className="relative">
      <div className="w-full h-[800px] relative overflow-hidden">
        <Canvas
          shadows
          camera={{
            fov: 45,
            near: 1,
            far: 100000000,
            position: [0, 5000, 0],
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(new THREE.Color(skyColor));
            gl.setPixelRatio(window.devicePixelRatio);
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
          }}
        >
          {/* TilesScene with integrated CSM */}
          <TilesScene
            currentLocation={currentLocation}
            isOrbiting={isOrbiting}
            timeOfDay={timeOfDay}
            setTileCount={onSetTileCount}
            setCopyrightInfo={onSetCopyrightInfo}
            setIsLoading={onSetIsLoading}
            setError={onSetError}
            setLoadingProgress={onSetLoadingProgress}
            setLightRef={setLightRef}
          />

          <EffectComposer>
            <BrightnessContrast brightness={brightnessValue} contrast={0.1} />
            <Vignette eskil={false} offset={0.1} darkness={vignetteDarkness} />
          </EffectComposer>
        </Canvas>

        {/* Controls panel (pick times, location, etc.) */}
        <ControlsPanel
          currentLocation={currentLocation}
          formattedTime={formattedTime}
          timeSpeed={timeSpeed}
          isOrbiting={isOrbiting}
          showShadowHelper={showShadowHelper}
          onSetTimeSpeed={onSetTimeSpeed}
          onChangeLocation={onSetCurrentLocation}
          onSetSpecificTime={setSpecificTime}
          onSetIsOrbiting={onSetIsOrbiting}
          onSetShowShadowHelper={setShowShadowHelper}
        />

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
      </div>
    </div>
  );
}
