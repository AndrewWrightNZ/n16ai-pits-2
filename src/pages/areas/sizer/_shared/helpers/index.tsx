// Types
import { PubArea } from "../../../../../_shared/types";

// Status indicator types
export type AreaStatus = "complete" | "incomplete" | "none";

// Get status indicator color and text
export const getStatusIndicator = (status: AreaStatus) => {
  switch (status) {
    case "complete":
      return {
        color: "bg-green-500",
        text: "All areas measured",
      };
    case "incomplete":
      return {
        color: "bg-orange-500",
        text: "Needs measurement",
      };
    case "none":
      return {
        color: "bg-gray-300",
        text: "No areas added",
      };
  }
};

// Get appropriate icon based on area type
export const getAreaTypeIcon = (type: string) => {
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

// Get appropriate status indicator for individual area
export const getAreaMeasurementStatus = (area: PubArea) => {
  if (area.floor_area) {
    return {
      dot: "bg-green-500",
      text: `${area.floor_area} m²`,
    };
  } else {
    return {
      dot: "bg-orange-500",
      text: "Needs measurement",
    };
  }
};
