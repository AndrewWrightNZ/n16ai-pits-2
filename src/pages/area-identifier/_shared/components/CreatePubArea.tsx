import { Pub } from "../../../../_shared/types";
import usePubAreas from "../hooks/usePubAreas";

interface CreatePubAreaProps {
  selectedPub: Pub | null;
  cameraInfo: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
  };
  tilesSceneRef: React.RefObject<any>;
}

const CreatePubArea = ({
  selectedPub,
  cameraInfo,
  tilesSceneRef,
}: CreatePubAreaProps) => {
  //

  // Hooks
  // Use the pub areas hook instead of individual state variables
  const {
    data: { name, description, type },
    operations: { onUpdatePubAreaDetails, onSavePubAreaDetails },
  } = usePubAreas();

  // Function to copy the current camera position for adding to presets
  const copyCurrentPositionAsPreset = () => {
    if (!tilesSceneRef.current) return;

    const position = tilesSceneRef.current.getCameraPosition();
    const target = tilesSceneRef.current.getCameraTarget();

    if (!position || !target) return;

    // Get lat/lng from the selected pub if available
    const lat = selectedPub?.latitude || 51.5074;
    const lng = selectedPub?.longitude || -0.1278;
    const pubId = selectedPub?.id || 0;
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

    onSavePubAreaDetails({
      pubId,
      latitude: lat,
      longitude: lng,
      cameraPosition: {
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
      },
    });

    // Copy to clipboard
    navigator.clipboard.writeText(presetCode);
  };
  return (
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
        <input
          type="text"
          value={name}
          onChange={(e) => onUpdatePubAreaDetails({ name: e.target.value })}
          placeholder="Enter Pub Area Name"
          className="bg-gray-800 text-white px-2 py-1 rounded text-xs"
        />
        <input
          type="text"
          value={description}
          onChange={(e) =>
            onUpdatePubAreaDetails({ description: e.target.value })
          }
          placeholder="Enter Pub Area Description"
          className="bg-gray-800 text-white px-2 py-1 rounded text-xs"
        />

        <select
          className="bg-gray-800 text-white px-2 py-1 rounded text-xs"
          value={type}
          onChange={(e) => onUpdatePubAreaDetails({ type: e.target.value })}
        >
          <option value="">Select Pub Area</option>
          <option value="pavement">Pavement</option>
          <option value="terrace">Terrace</option>
          <option value="beer-garden">Beer garden</option>
          {/* Add more options as needed */}
        </select>

        <button
          className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded disabled:opacity-50"
          onClick={copyCurrentPositionAsPreset}
          disabled={!name || !description || !type}
        >
          Save PubArea view
        </button>

        <p className="text-xs text-gray-400 mt-1">
          Use orbit controls to adjust view before saving
        </p>
      </div>
    </div>
  );
};

export default CreatePubArea;
