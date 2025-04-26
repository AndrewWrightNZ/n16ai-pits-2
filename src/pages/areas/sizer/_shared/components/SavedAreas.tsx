import React, { useMemo, useEffect } from "react";

// Types
import { PubArea } from "../../../../../_shared/types";

// Hooks
import usePubAreas from "../../../identifier/_shared/hooks/usePubAreas";

// Helpers
import {
  AreaStatus,
  getAreaMeasurementStatus,
  getAreaTypeIcon,
  getStatusIndicator,
} from "../helpers";

interface SavedAreaProps {
  areas: PubArea[];
  onSelectArea: (areaId: number) => void;
  selectedAreaId: number | null;
}

const SavedAreas: React.FC<SavedAreaProps> = ({
  areas,
  onSelectArea,
  selectedAreaId,
}) => {
  // Hooks
  const {
    data: { selectedPub, isSettingPubAreasMeasured },
    operations: { onSetPubAreasMeasuredForPub },
  } = usePubAreas();

  // Variables
  const { has_areas_measured = false } = selectedPub || {};

  // Calculate the status of all areas
  const areaStatus: AreaStatus = useMemo(() => {
    if (areas.length === 0) return "none";

    // Check if any areas are missing floor_area
    const hasIncompleteAreas = areas.some((area) => !area.floor_area);

    return hasIncompleteAreas ? "incomplete" : "complete";
  }, [areas]);

  // Auto-trigger effect: When area status becomes complete
  useEffect(() => {
    // Only proceed if:
    // 1. Areas are complete
    // 2. There are areas
    // 3. Areas are not already marked as measured
    // 4. We're not currently in the process of setting areas as measured
    if (
      areaStatus === "complete" &&
      areas.length > 0 &&
      !has_areas_measured &&
      !isSettingPubAreasMeasured
    ) {
      onSetPubAreasMeasuredForPub();
    }
  }, [
    areaStatus,
    areas.length,
    has_areas_measured,
    isSettingPubAreasMeasured,
    onSetPubAreasMeasuredForPub,
    selectedPub?.id,
  ]);

  const statusIndicator = getStatusIndicator(areaStatus);

  // Format the date to be more readable
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold">Saved Areas</h2>
          {areas.length > 0 && (
            <div className="flex items-center ml-3">
              <div
                className={`w-2.5 h-2.5 rounded-full ${statusIndicator.color} mr-1.5`}
              />
              <span className="text-xs text-gray-500">
                {statusIndicator.text}
              </span>
            </div>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {areas.length} {areas.length === 1 ? "area" : "areas"}
        </span>
      </div>

      {areas.length === 0 ? (
        <p className="text-gray-500 italic text-sm">
          No areas saved for this pub
        </p>
      ) : (
        <>
          <div className="max-h-72 overflow-y-auto">
            {areas.map((area) => {
              const areaStatus = getAreaMeasurementStatus(area);

              return (
                <div
                  key={area.id}
                  className={`
                  p-3 mb-2 rounded border cursor-pointer transition-all duration-150
                  ${
                    selectedAreaId === area.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }
                `}
                  onClick={() => onSelectArea(area.id)}
                >
                  <div className="flex items-center">
                    <div
                      className={`
                      mr-3 p-2 rounded-full
                      ${
                        selectedAreaId === area.id
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }
                    `}
                    >
                      {getAreaTypeIcon(area.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-gray-900 truncate">
                          {area.name}
                        </h3>
                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
                          {area.type.replace("-", " ")}
                        </span>
                      </div>
                      {area.description && (
                        <p className="text-sm text-gray-500 truncate">
                          {area.description}
                        </p>
                      )}

                      <div className="flex items-center mt-2">
                        <div
                          className={`w-2 h-2 rounded-full ${areaStatus.dot} mr-1.5`}
                        ></div>
                        <p className="text-sm text-gray-500">
                          {areaStatus.text}
                        </p>
                      </div>

                      <p className="text-xs text-gray-400 mt-1">
                        Added on {formatDate(area.created_at)}
                      </p>
                    </div>
                  </div>
                  {selectedAreaId === area.id && (
                    <div className="mt-2 flex justify-end">
                      <button className="text-xs text-blue-600 hover:text-blue-800 mr-3">
                        Edit
                      </button>
                      <button className="text-xs text-red-600 hover:text-red-800">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {has_areas_measured ? (
            <div className="flex items-center ml-3">
              <div className={`w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5`} />
              <span className="text-xs text-gray-500">Pub areas measured</span>
            </div>
          ) : (
            <button
              disabled={areaStatus !== "complete" || isSettingPubAreasMeasured}
              className={`px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 flex-1 disabled:opacity-50 disabled:cursor-not-allowed mt-3`}
              onClick={onSetPubAreasMeasuredForPub}
            >
              {isSettingPubAreasMeasured
                ? "Setting Areas..."
                : "Set Floor Areas Measured"}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default SavedAreas;
