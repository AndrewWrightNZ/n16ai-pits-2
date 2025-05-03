import { Beer, Coffee, Umbrella, Home, Building, Waves } from "lucide-react";

// Helper function to convert time slot index to formatted time string
export const formatTimeSlot = (slot: number): string => {
  const hour = Math.floor(slot / 4) + 12; // 0 = 12pm, 4 = 1pm, etc.
  const minute = (slot % 4) * 15; // 0, 15, 30, 45

  // Format as 12-hour time with am/pm
  const hourDisplay = hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? "pm" : "am";

  return `${hourDisplay}:${minute.toString().padStart(2, "0")}${ampm}`;
};

// Get icon for area type
export const getIconForAreaType = (type: string) => {
  switch (type) {
    case "beer-garden":
      return <Beer size={20} color="#1d293d" />;
    case "terrace":
      return <Coffee size={20} color="#1d293d" />;
    case "pavement":
      return <Umbrella size={20} color="#1d293d" />;
    case "frontage-seating":
      return <Home size={20} color="#1d293d" />;
    case "courtyard":
      return <Building size={20} color="#1d293d" />;
    case "terrace-waterfront":
      return <Waves size={20} color="#1d293d" />;
    default:
      return <Umbrella size={20} color="#1d293d" />;
  }
};
