// Hooks
import usePubAreas from "../hooks/usePubAreas";

// Types
import { PubArea } from "../../../../_shared/types";

interface CreatePubAreaProps {
  cameraInfo: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
  };
  tilesSceneRef: React.RefObject<any>;
}

const CreatePubArea = ({ cameraInfo, tilesSceneRef }: CreatePubAreaProps) => {
  //

  // Hooks
  const {
    data: {
      // Loading
      isSavingNewPubArea,
      isLoadingAreasForPub,
      isSettingPubAreasPresent,

      // Pub
      selectedPub,

      // Draft details
      name,
      description,
      type,

      // Areas
      areasForPub = [],
    },
    operations: {
      onUpdatePubAreaDetails,
      onSavePubAreaDetails,
      onSetPubAreasPresentForPub,
    },
  } = usePubAreas();

  //

  // Variables
  const { has_areas_added = false } = selectedPub || {};

  //

  // Handlers
  const copyCurrentPositionAsPreset = () => {
    if (!tilesSceneRef.current) return;

    const position = tilesSceneRef.current.getCameraPosition();
    const target = tilesSceneRef.current.getCameraTarget();

    if (!position || !target) return;

    // Get lat/lng from the selected pub if available
    const lat = selectedPub?.latitude || 51.5074;
    const lng = selectedPub?.longitude || -0.1278;
    const pubId = selectedPub?.id || 0;

    onSavePubAreaDetails({
      pub_id: pubId,
      latitude: lat,
      longitude: lng,
      camera_position: {
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
  };

  // Function to handle clicking on a pub area to view it
  const handleViewPubArea = (pubArea: PubArea) => {
    if (!tilesSceneRef.current || !pubArea.camera_position) return;

    // Set the camera position and target from the pub area
    const { position, target } = pubArea.camera_position;

    // Use the tilesSceneRef to update the camera
    tilesSceneRef.current.setCameraPosition(position);
    tilesSceneRef.current.setCameraTarget(target);
  };

  return (
    <div className="absolute top-36 right-4 bg-black/70 text-white p-3 rounded z-20 w-64">
      <h3 className="text-sm font-bold mb-2">
        Pub Areas {selectedPub && `- ${selectedPub.name}`}
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
          <option value="frontage-seating">Frontage seating</option>
          <option value="terrace">Terrace</option>
          <option value="beer-garden">Beer garden</option>
          <option value="courtyard">Courtyard</option>
          {/* Add more options as needed */}
        </select>

        <button
          className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded disabled:opacity-50"
          onClick={copyCurrentPositionAsPreset}
          disabled={
            !name || !description || !type || !selectedPub || isSavingNewPubArea
          }
        >
          {isSavingNewPubArea ? "Saving... " : "Save PubArea view"}
        </button>
      </div>

      <h3 className="text-sm font-bold mb-2 mt-4">
        Existing Pub Areas ({areasForPub?.length})
      </h3>

      {/* Pub Areas List */}
      <div className="max-h-48 overflow-y-auto">
        {isLoadingAreasForPub ? (
          <div className="text-xs text-gray-400">Loading pub areas...</div>
        ) : areasForPub.length === 0 ? (
          <div className="text-xs text-gray-400">No pub areas found</div>
        ) : (
          <>
            <ul className="space-y-2">
              {areasForPub.map((area) => (
                <li
                  key={area.id}
                  className="bg-gray-800 rounded p-2 text-xs cursor-pointer hover:bg-gray-700 transition-colors"
                  onClick={() => handleViewPubArea(area)}
                >
                  <div className="font-bold">{area.name}</div>
                  <div className="text-gray-300">{area.description}</div>
                  <div className="text-gray-400 mt-1">Type: {area.type}</div>
                </li>
              ))}
            </ul>

            {!has_areas_added && (
              <button
                className="bg-green-600 w-full mt-4 hover:bg-green-700 text-white text-xs px-2 py-1 rounded disabled:opacity-50"
                onClick={onSetPubAreasPresentForPub}
                disabled={isSettingPubAreasPresent}
              >
                {isSettingPubAreasPresent
                  ? "Updating... "
                  : "Set PubAreas present"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CreatePubArea;
