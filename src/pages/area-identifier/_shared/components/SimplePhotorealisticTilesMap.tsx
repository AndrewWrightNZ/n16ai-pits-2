import * as THREE from "three";
import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import useMapSettings from "../../../../maps/_shared/hooks/useMapSettings";
import BasicTilesScene, { TilesSceneRef } from "./BasicTileScene";
import EnhancedMemoryMonitor from "../../../../maps/_shared/components/EnhancedMemoryMonitor";

export default function SimplePhotorealisticTilesMap() {
  // Ref to access TilesRendererService
  const tilesSceneRef = useRef<TilesSceneRef>(null);

  // Hooks - only keep what's needed for loading states
  const {
    data: {
      // Loading
      isLoading,
      loadingProgress,
      error,
      tileCount,

      // View - only for copyright info
      copyrightInfo,
    },
  } = useMapSettings();

  return (
    <div className="relative">
      <div className="w-full h-[850px] mx-auto relative overflow-hidden">
        <Canvas
          camera={{
            fov: 25,
            near: 1,
            far: 400,
            position: [0, 800, 0],
          }}
          onCreated={({ gl }) => {
            // Black background
            gl.setClearColor(new THREE.Color(0x000000)); // Black
            gl.setPixelRatio(window.devicePixelRatio);

            // We don't need shadow maps for the basic version
            gl.shadowMap.enabled = false;

            // Keep the zoom for consistent view
            gl.domElement.style.transform = "scale(1.1)";
            gl.domElement.style.transformOrigin = "center center";
          }}
        >
          {/* Just use the BasicTilesScene */}
          <BasicTilesScene ref={tilesSceneRef} />
        </Canvas>

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
