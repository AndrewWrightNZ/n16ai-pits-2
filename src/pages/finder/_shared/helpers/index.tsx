// Helper function to convert time slot index to formatted time string
export const formatTimeSlot = (slot: number): string => {
  const hour = Math.floor(slot / 4) + 12; // 0 = 12pm, 4 = 1pm, etc.
  const minute = (slot % 4) * 15; // 0, 15, 30, 45

  // Format as 12-hour time with am/pm
  const hourDisplay = hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? "pm" : "am";

  return `${hourDisplay}:${minute.toString().padStart(2, "0")}${ampm}`;
};
