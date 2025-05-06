// Define the area types that can be filtered
export const AREA_TYPES = [
  { key: "pavement", label: "Pavement" },
  { key: "frontage-seating", label: "Frontage Seating" },
  { key: "terrace", label: "Terrace" },
  { key: "terrace-waterfront", label: "Waterfront Terrace" },
  { key: "beer-garden", label: "Beer Garden" },
  { key: "courtyard", label: "Courtyard" },
];

//

// Helpers
export const formatAreaType = (type: string) => {
  const areaType = AREA_TYPES.find((a) => a.key === type);
  return areaType?.label || type;
};

// Function to convert time integer to a readable format
// Time integers (0,1,2,3 etc) map to 15min slots from 12.00pm
// e.g., 0 is 12:00pm, 1 is 12:15pm, 2 is 12:30pm, 3 is 12:45pm, etc.
export const formatTimeLabel = (timeValue: number) => {
  const hour = Math.floor(timeValue / 4) + 12; // Add 12 since we start from 12pm
  const minute = (timeValue % 4) * 15;

  // Format hours for display (convert to 12-hour format)
  const displayHour = hour > 12 ? hour - 12 : hour;
  // Format minutes with leading zero if needed
  const displayMinute = minute.toString().padStart(2, "0");
  // Add am/pm suffix
  const period = hour >= 12 ? "pm" : "am";

  return `${displayHour}:${displayMinute}${period}`;
};
