import React from "react";

// Types
import { PubArea } from "../../../../_shared/types";

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
  // Format the date to be more readable
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  // Get appropriate icon based on area type
  const getAreaTypeIcon = (type: string) => {
    switch (type) {
      case "terrace":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path
              fillRule="evenodd"
              d="M16 10a6 6 0 11-12 0 6 6 0 0112 0zm-1 0a5 5 0 11-10 0 5 5 0 0110 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "frontage-seating":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2-1h8a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Saved Areas</h2>
        <span className="text-xs text-gray-500">
          {areas.length} {areas.length === 1 ? "area" : "areas"}
        </span>
      </div>

      {areas.length === 0 ? (
        <p className="text-gray-500 italic text-sm">
          No areas saved for this pub
        </p>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          {areas.map((area) => (
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

                  <p className="text-sm text-gray-500 truncate mt-2">
                    {area.floor_area || "-"} m2
                  </p>

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
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedAreas;
