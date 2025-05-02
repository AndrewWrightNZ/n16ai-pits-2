import { Sun } from "lucide-react";
import { formatTimeLabel } from "../../../_shared";

export const formatShortAddress = (address: string, postcode?: string) => {
  // Return the first two parts of the address, split by commas
  const initialShortAddress = address.split(",").slice(0, 2).join(", ");

  const withPostCodeRemoved = postcode
    ? initialShortAddress.replace(postcode, "")
    : initialShortAddress;

  return withPostCodeRemoved.trim();
};

// Format area size to 2 decimal places
export const formatAreaSize = (size: any) => {
  return size.toFixed(2);
};

// Format area types for display
export const formatAreaTypes = (types: any) => {
  if (!types || types.length === 0) return "None";

  return types
    .map((type: any) =>
      type
        .split("-")
        .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    )
    .join(", ");
};

export const renderSunRating = (
  sunPercentage: number,
  currentTimeSlot?: number
) => {
  // Determine how many sun icons to show based on percentage
  let sunCount = 0;
  if (sunPercentage >= 75) sunCount = 3;
  else if (sunPercentage >= 40) sunCount = 2;
  else if (sunPercentage > 0) sunCount = 1;

  return (
    <div className="flex items-start w-full">
      {/* Generate sun icons based on count */}
      <div className="flex items-start justify-start w-[150px]">
        {sunCount > 0 &&
          Array(sunCount)
            .fill(0)
            .map((_, index) => (
              <Sun key={index} className="h-5 w-5 text-amber-500" />
            ))}
      </div>
      <span
        className={`w-[200px] text-left ${sunPercentage === 0 ? "text-gray-500" : ""}`}
      >
        {sunPercentage}% in sun{" "}
        {currentTimeSlot
          ? `at ${formatTimeLabel(currentTimeSlot)}`
          : "right now"}
      </span>
    </div>
  );
};

export const extractPostCodeFromAddress = (address: string) => {
  const postcode =
    address.match(/([A-Z]{1,2}[0-9][0-9A-Z]?)\s?[0-9][A-Z]{2}/)?.[0] || "N/A";

  return postcode;
};
