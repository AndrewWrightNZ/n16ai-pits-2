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

// Format the real time display
export const formatRealTime = (minutesLeftInSun: number) => {
  if (!minutesLeftInSun) return "No more sun today";

  const hours = Math.floor(minutesLeftInSun / 60);
  const minutes = minutesLeftInSun % 60;

  if (minutesLeftInSun >= 60) {
    return `~ ${hours} hour${hours !== 1 ? "s" : ""} ${minutes > 0 ? `${minutes} mins` : ""} left`;
  } else {
    return `~ ${minutesLeftInSun} minutes left`;
  }
};

export const formatHumanized = (minutesLeftInSun: number) => {
  if (minutesLeftInSun > 120) {
    return `Time for a few pints`;
  } else if (minutesLeftInSun > 60) {
    return `Time for a couple of pints`;
  } else if (minutesLeftInSun > 30) {
    return `Time for a pint`;
  } else if (minutesLeftInSun > 0) {
    return `Time for a quick pint`;
  } else {
    return "No more sun today";
  }
};
