import { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";

import * as THREE from "three";
import ShadowHelper, { GroundPlane } from "./ShadowHelper";
import TilesScene from "./_shared/components/TilesScene";
import ControlsPanel from "./_shared/components/ControlsPanel";
import { PRESET_LOCATIONS } from "./_shared/hooks/locationsData";

// Main component
const PhotorealisticTilesMap = () => {
  const [currentLocation, setCurrentLocation] = useState<string>(
    Object.keys(PRESET_LOCATIONS)[0]
  );
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const [copyrightInfo, setCopyrightInfo] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [tileCount, setTileCount] = useState<number>(0);

  // New state for time control
  const [timeOfDay, setTimeOfDay] = useState<Date>(new Date());
  const [timeSpeed, setTimeSpeed] = useState<number>(0); // 0 = paused, 1-10 = speed multiplier

  // Function to change location
  const changeLocation = (locationKey: string) => {
    setCurrentLocation(locationKey);
  };

  // Function to set a specific time
  const setSpecificTime = (hours: number, minutes: number = 0) => {
    const newTime = new Date();
    newTime.setHours(hours, minutes, 0);
    setTimeOfDay(newTime);
  };

  // Effect to control time progression
  useEffect(() => {
    if (timeSpeed === 0) return; // Do nothing if paused

    const interval = setInterval(() => {
      setTimeOfDay((prevTime) => {
        const newTime = new Date(prevTime);
        // Advance minutes based on speed (faster = more minutes per interval)
        newTime.setMinutes(newTime.getMinutes() + timeSpeed * 5);
        return newTime;
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [timeSpeed]);

  const isUsingHighRes = false;
  const glSettings = isUsingHighRes
    ? {
        antialias: true,
        pixelRatio: window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio,
        precision: "highp", // High precision rendering
      }
    : {};

  // Format time for display
  const formattedTime = timeOfDay.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Add a state for the shadow helper visibility
  const [showShadowHelper, setShowShadowHelper] = useState<boolean>(false);

  // Add a ref for the directional light
  const directionalLightRef =
    useRef<React.RefObject<THREE.DirectionalLight>>(null);

  // Function to set the light ref from the child component
  const setLightRef = (ref: React.RefObject<THREE.DirectionalLight>) => {
    directionalLightRef.current = ref;
  };

  return (
    <div className="relative">
      <div className="w-full h-[800px] relative overflow-hidden">
        <Canvas
          shadows // Enable shadows in the canvas
          camera={{
            fov: 45,
            near: 1,
            far: 100000000,
            position: [0, 5000, 0],
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x87ceeb);
            gl.setPixelRatio(window.devicePixelRatio);
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
          }}
          gl={glSettings}
        >
          <TilesScene
            currentLocation={currentLocation}
            isOrbiting={isOrbiting}
            timeOfDay={timeOfDay}
            setTileCount={setTileCount}
            setCopyrightInfo={setCopyrightInfo}
            setIsLoading={setIsLoading}
            setError={setError}
            setLoadingProgress={setLoadingProgress}
            setLightRef={setLightRef}
            locations={PRESET_LOCATIONS}
          />

          {/* Add the Shadow Helper when enabled */}
          {showShadowHelper && directionalLightRef.current && (
            <>
              <ShadowHelper
                directionalLightRef={directionalLightRef.current}
                visible={showShadowHelper}
              />
              <GroundPlane height={-20} />
            </>
          )}
        </Canvas>

        {/* Loading indicator */}
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

        {/* Error message */}
        {error && (
          <div className="absolute inset-0 bg-black/70 flex justify-center items-center text-white p-5 text-center z-50">
            <div>
              <h3 className="text-xl font-bold mb-2">Error</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Tile count indicator */}
        {!isLoading && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white bg-black/50 py-1 px-2.5 rounded text-xs z-10">
            {tileCount > 0
              ? `Tiles loaded: ${tileCount}`
              : "No tiles visible - try resetting view"}
          </div>
        )}

        {/* Controls panel */}
        <ControlsPanel
          currentLocation={currentLocation}
          formattedTime={formattedTime}
          timeSpeed={timeSpeed}
          isOrbiting={isOrbiting}
          showShadowHelper={showShadowHelper}
          onSetTimeSpeed={setTimeSpeed}
          onChangeLocation={changeLocation}
          onSetSpecificTime={setSpecificTime}
          onSetIsOrbiting={setIsOrbiting}
          onSetShowShadowHelper={setShowShadowHelper}
        />

        {/* Google logo attribution */}
        <div className="absolute bottom-1 left-1 z-10">
          <img
            src="https://www.gstatic.com/images/branding/googlelogo/1x/googlelogo_color_68x28dp.png"
            alt="Google"
            height="20"
            className="h-5"
          />
        </div>

        {/* Copyright information */}
        {copyrightInfo && (
          <div className="absolute bottom-1 right-1 text-[10px] text-white bg-black/50 py-0.5 px-1 rounded-sm z-10">
            {copyrightInfo}
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotorealisticTilesMap;
