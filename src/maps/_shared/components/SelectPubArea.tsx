// Hooks
import usePubAreas from "../../../pages/area-identifier/_shared/hooks/usePubAreas";

// Types
import { PubArea } from "../../../_shared/types";

interface SelectPubAreaProps {
  tilesSceneRef: React.RefObject<any>;
}

import React, { useEffect } from "react";

const SelectPubArea = ({ tilesSceneRef }: SelectPubAreaProps) => {
  //

  // Hooks
  const {
    data: {
      // Loading
      isLoadingAreasForPub,
      isSettingPubAreasPresent,

      // Pub
      selectedPub,

      // Areas
      areasForPub = [],
    },
    operations: { onSetPubAreasPresentForPub },
  } = usePubAreas();

  //

  // Variables
  const { has_areas_added = false } = selectedPub || {};

  //

  // Handlers
  const handleViewPubArea = (pubArea: PubArea) => {
    if (!tilesSceneRef.current || !pubArea.camera_position) return;

    // Set the camera position and target from the pub area
    const { position, target } = pubArea.camera_position;

    // Use the tilesSceneRef to update the camera
    tilesSceneRef.current.setCameraPosition(position);
    tilesSceneRef.current.setCameraTarget(target);
  };

  // On mount or when areasForPub changes, wait 1 second and set camera to first area's position
  useEffect(() => {
    if (areasForPub.length > 0) {
      const timeout = setTimeout(() => {
        handleViewPubArea(areasForPub[0]);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [areasForPub]);

  return (
    <div className="absolute top-24 right-2 bg-black/70 text-white p-3 rounded z-20 w-64">
      <h3 className="text-sm font-bold mb-2 mt-4">
        Marked Pub Areas ({areasForPub?.length})
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
                  className={
                    "rounded p-2 text-xs cursor-pointer transition-colors bg-gray-800 hover:bg-gray-700"
                  }
                  onClick={() => handleViewPubArea(area)}
                >
                  <div className="font-bold">{area.name}</div>
                  <div className="text-gray-300">{area.description}</div>
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

export default SelectPubArea;
