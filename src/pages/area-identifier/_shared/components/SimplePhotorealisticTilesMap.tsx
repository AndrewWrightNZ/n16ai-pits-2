import * as THREE from "three";
import { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import useMapSettings from "../../../../maps/_shared/hooks/useMapSettings";
import EnhancedTilesScene, { TilesSceneRef } from "./BasicTileScene";
import EnhancedMemoryMonitor from "../../../../maps/_shared/components/EnhancedMemoryMonitor";
import DraggableLocationsModal from "./DraggableLocationsModal";
import { PRESET_LOCATIONS } from "../../../../maps/_shared/hooks/locationsData";
import { Pub } from "../../../../_shared/types";

// Define an interface for camera view data
interface CameraViewData {
  position: {
    x: number;
    y: number;
    z: number;
  };
  target: {
    x: number;
    y: number;
    z: number;
  };
}

export default function SimplePhotorealisticTilesMap() {
  // Ref to access TilesRendererService and camera functions
  const tilesSceneRef = useRef<TilesSceneRef>(null);

  // State for tracking camera details
  const [cameraInfo, setCameraInfo] = useState({
    position: { x: 0, y: 0, z: 0 },
    target: { x: 0, y: 0, z: 0 },
  });

  // State to track the currently selected pub
  const [selectedPub, setSelectedPub] = useState<Pub | null>(null);

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

  // Function to jump to pub location using lat/lng
  const handleJumpToPub = (pub: Pub) => {
    if (!pub.latitude || !pub.longitude) return;

    // Store the selected pub for later use
    setSelectedPub(pub);

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

    // Get lat/lng from the selected pub if available
    const lat = selectedPub?.latitude || 51.5074;
    const lng = selectedPub?.longitude || -0.1278;
    const pubName = selectedPub?.name || "My Custom Location";
    const locationKey = selectedPub
      ? selectedPub.name.toLowerCase().replace(/[^a-z0-9]/g, "_")
      : "my_location";

    // Create a complete preset template with current position and pub's lat/lng
    const presetCode = `
  ${locationKey}: {
    lat: ${lat}, // Geographic latitude
    lng: ${lng}, // Geographic longitude
    altitude: ${parseFloat(Math.abs(position.y).toFixed(2))},
    heading: 0,
    description: "${pubName}",
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
    alert("Complete position data copied to clipboard!");
  };

  // Function to save current view to pub data
  const saveViewToPub = () => {
    if (!selectedPub || !tilesSceneRef.current) return;

    const position = tilesSceneRef.current.getCameraPosition();
    const target = tilesSceneRef.current.getCameraTarget();

    if (!position || !target) return;

    // Create camera view data object
    const cameraViewData: CameraViewData = {
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
    };

    // Create a complete data object to save to database
    const pubViewData = {
      pub_id: selectedPub.id,
      latitude: selectedPub.latitude,
      longitude: selectedPub.longitude,
      name: selectedPub.name,
      camera_view: cameraViewData,
    };

    // Convert to JSON for saving to database
    const jsonData = JSON.stringify(pubViewData, null, 2);

    // Copy to clipboard (you would normally send this to your backend)
    navigator.clipboard.writeText(jsonData);

    // Show confirmation
    alert(
      `View data for "${selectedPub.name}" copied to clipboard!\n\nIn a real implementation, this would be saved to your database.`
    );

    console.log("Pub view data to save:", pubViewData);

    // Here you would typically make an API call to save this data
    // Example: savePubView(pubViewData);
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
          <div className="absolute top-36 right-4 bg-black/70 text-white p-3 rounded z-20 w-64">
            <h3 className="text-sm font-bold mb-2">
              Camera Details {selectedPub && `- ${selectedPub.name}`}
            </h3>
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
              {selectedPub && (
                <div>
                  <strong>Location: </strong>
                  Lat: {selectedPub.latitude.toFixed(4)}, Lng:{" "}
                  {selectedPub.longitude.toFixed(4)}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-col space-y-2">
              <button
                className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                onClick={copyCurrentPositionAsPreset}
              >
                Copy as PRESET_LOCATIONS Entry
              </button>

              {selectedPub && (
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                  onClick={saveViewToPub}
                >
                  Save View to Pub Data
                </button>
              )}

              <p className="text-xs text-gray-400 mt-1">
                Use orbit controls to adjust view before saving
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
