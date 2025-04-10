import * as THREE from "three";
import { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import useMapSettings from "../../../../maps/_shared/hooks/useMapSettings";
import EnhancedTilesScene, { TilesSceneRef } from "./BasicTileScene";
import EnhancedMemoryMonitor from "../../../../maps/_shared/components/EnhancedMemoryMonitor";
import DraggableLocationsModal from "./DraggableLocationsModal";
import { PRESET_LOCATIONS } from "../../../../maps/_shared/hooks/locationsData";
import { Pub } from "../../../../_shared/types";

export default function SimplePhotorealisticTilesMap() {
  // Ref to access TilesRendererService and camera functions
  const tilesSceneRef = useRef<TilesSceneRef>(null);

  // State for tracking camera details
  const [cameraInfo, setCameraInfo] = useState({
    position: { x: 0, y: 0, z: 0 },
    target: { x: 0, y: 0, z: 0 },
  });

  // State to control camera panel visibility
  const [showCameraPanel, setShowCameraPanel] = useState(false);

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
    operations: {
      // Location
      onSetCurrentLocation,
    },
  } = useMapSettings();

  // Function to update camera information
  const updateCameraInfo = () => {
    if (tilesSceneRef.current) {
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
  };

  // Update camera info at regular intervals
  useEffect(() => {
    if (!isLoading) {
      const intervalId = setInterval(() => {
        updateCameraInfo();
      }, 1000); // Update every second

      return () => clearInterval(intervalId);
    }
  }, [isLoading]);

  // Simple function to jump to pub location using lat/lng
  const handleJumpToPub = (pub: Pub) => {
    if (!pub.latitude || !pub.longitude) return;

    // Create a temporary location key
    const tempKey = `temp_pub_${pub.id}`;

    // Create a basic location object with just lat/lng
    const tempLocation = {
      lat: pub.latitude,
      lng: pub.longitude,
      altitude: 250, // Default viewing height
      heading: 0, // Default heading
      description: pub.name,
    };

    // Add to PRESET_LOCATIONS temporarily
    PRESET_LOCATIONS[tempKey] = tempLocation;

    // Set as current location
    onSetCurrentLocation(tempKey);

    // Show camera panel after a short delay
    setTimeout(() => {
      setShowCameraPanel(true);
    }, 1000);
  };

  // Function to copy the current camera position for adding to presets
  const copyCurrentPositionAsPreset = () => {
    if (!tilesSceneRef.current) return;

    const position = tilesSceneRef.current.getCameraPosition();
    const target = tilesSceneRef.current.getCameraTarget();

    if (!position || !target) return;

    // Create a simple preset template with current position
    const presetCode = `
  my_location: {
    lat: 51.5074, // Update with correct latitude
    lng: -0.1278, // Update with correct longitude
    altitude: ${parseFloat(Math.abs(position.y).toFixed(2))},
    heading: 0,   // Update as needed
    description: "My Custom Location",
    // Camera position details
    position: {
      x: ${parseFloat(position.x.toFixed(2))},
      y: ${parseFloat(position.y.toFixed(2))},
      z: ${parseFloat(position.z.toFixed(2))}
    },
    target: {
      x: ${parseFloat(target.x.toFixed(2))},
      y: ${parseFloat(target.y.toFixed(2))},
      z: ${parseFloat(target.z.toFixed(2))}
    }
  },`;

    // Copy to clipboard
    navigator.clipboard.writeText(presetCode);
    alert("Position code copied! Update lat/lng values before using.");
  };

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
          {/* Use the EnhancedTilesScene for camera tracking */}
          <EnhancedTilesScene ref={tilesSceneRef} />
        </Canvas>

        {/* Simplified location modal with pub jumping capability */}
        <DraggableLocationsModal
          onJumpToPub={handleJumpToPub}
          title="Locations & Pubs"
        />

        {/* Camera Details Button - always visible */}
        <button
          className="absolute top-22 right-4 bg-black/70 text-white px-3 py-1.5 rounded z-20 text-sm flex items-center"
          onClick={() => setShowCameraPanel(!showCameraPanel)}
        >
          {showCameraPanel ? "Hide Camera Details" : "Show Camera Details"}
        </button>

        {/* Camera Details Panel - conditionally rendered */}
        {showCameraPanel && !isLoading && (
          <div className="absolute top-26 right-4 bg-black/70 text-white p-3 rounded z-20 w-64">
            <h3 className="text-sm font-bold mb-2">Camera Details</h3>
            <div className="text-xs space-y-1">
              <div>
                <strong>Position: </strong>
                X: {cameraInfo.position.x}, Y: {cameraInfo.position.y}, Z:{" "}
                {cameraInfo.position.z}
              </div>
              <div>
                <strong>Target: </strong>
                X: {cameraInfo.target.x}, Y: {cameraInfo.target.y}, Z:{" "}
                {cameraInfo.target.z}
              </div>
            </div>
            <div className="mt-3">
              <button
                className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                onClick={copyCurrentPositionAsPreset}
              >
                Copy Current Position
              </button>
              <p className="text-xs text-gray-400 mt-1">
                Use orbit controls to adjust view before copying
              </p>
            </div>
          </div>
        )}

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
