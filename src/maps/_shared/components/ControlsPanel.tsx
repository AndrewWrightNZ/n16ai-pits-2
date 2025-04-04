import { cn } from "../../../utils";
import { PRESET_LOCATIONS, PresetLocation } from "../hooks/locationsData";
import useMapSettings from "../hooks/useMapSettings";
import { useState } from "react";

interface ControlsPanelProps {
  onSetSpecificTime: (hour: number) => void;
}

const ControlsPanel = ({ onSetSpecificTime }: ControlsPanelProps) => {
  // Hooks
  const {
    data: {
      // View
      isOrbiting,
      timeSpeed,
      formattedTime,

      // Location
      currentLocation,
    },
    operations: {
      onSetTimeSpeed,
      onSetIsOrbiting,

      // Location
      onSetCurrentLocation,
    },
  } = useMapSettings();

  // Local state for slider
  const [sliderValue, setSliderValue] = useState(12 * 4); // Default to noon (12 * 4 quarter hours)

  // Format the time from the slider value (0-95 representing quarter hours)
  const formatSliderTime = (value: number) => {
    const hours = Math.floor(value / 4);
    const minutes = (value % 4) * 15;
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Handle slider change - update in real-time
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setSliderValue(value);

    // Update time in real-time as user slides
    const hours = Math.floor(value / 4);
    const minutes = (value % 4) * 15;
    onSetSpecificTime(hours + minutes / 60);
  };

  return (
    <>
      <div className="absolute top-2.5 left-2.5 bg-white/80 p-2.5 rounded z-10 max-w-[250px]">
        <h3 className="font-bold text-gray-800 mb-2.5">3D Controls</h3>

        {/* Location selection */}
        <div className="mb-2.5">
          <p className="font-medium text-sm mb-1">Change Location:</p>

          {Object.entries(PRESET_LOCATIONS).map(([key, loc]) => (
            <LocationButton
              key={key}
              locationKey={key}
              location={loc}
              isActive={currentLocation === key}
              onClick={() => onSetCurrentLocation(key)}
            />
          ))}
        </div>

        {/* Time of day controls */}
        <div className="mb-2.5">
          <p className="font-medium text-sm mb-1">Time: {formattedTime}</p>

          {/* Time slider */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>12 AM</span>
              <span>12 PM</span>
              <span>11 PM</span>
            </div>
            <input
              type="range"
              min="0"
              max="95"
              step="1"
              value={sliderValue}
              onChange={handleSliderChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-center text-sm font-medium mt-1">
              {formatSliderTime(sliderValue)}
            </div>
          </div>

          {/* Quick time presets */}
          <div className="grid grid-cols-4 gap-1 mb-1">
            <TimeButton
              label="6 AM"
              onClick={() => {
                setSliderValue(6 * 4);
                onSetSpecificTime(6);
              }}
            />
            <TimeButton
              label="Noon"
              onClick={() => {
                setSliderValue(12 * 4);
                onSetSpecificTime(12);
              }}
            />
            <TimeButton
              label="6 PM"
              onClick={() => {
                setSliderValue(18 * 4);
                onSetSpecificTime(18);
              }}
            />
            <TimeButton
              label="9 PM"
              onClick={() => {
                setSliderValue(21 * 4);
                onSetSpecificTime(21);
              }}
            />
          </div>

          {/* Time speed controls */}
          <div className="mt-2">
            <p className="font-medium text-xs mb-1">Time Speed:</p>
            <div className="flex justify-between items-center">
              <button
                onClick={() => onSetTimeSpeed(0)}
                className={cn(
                  "px-2 py-1 text-xs rounded",
                  timeSpeed === 0
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                )}
              >
                Pause
              </button>

              <div className="flex gap-1">
                {[1, 5, 10].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => onSetTimeSpeed(speed)}
                    className={cn(
                      "px-2 py-1 text-xs rounded",
                      timeSpeed === speed
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 hover:bg-gray-300"
                    )}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Orbit controls */}
        <div className="mb-2.5">
          <p className="font-medium text-sm mb-1">Camera Controls:</p>
          <button
            onClick={() => onSetIsOrbiting(!isOrbiting)}
            className={cn(
              "w-full py-2 px-3 mb-1 text-sm font-medium border rounded shadow-sm transition-colors",
              isOrbiting
                ? "bg-yellow-500 text-white border-yellow-600"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
            )}
          >
            {isOrbiting ? "Stop Orbit" : "Start Orbit"}
          </button>
        </div>
      </div>
    </>
  );
};

// Location Button component
const LocationButton = ({
  locationKey,
  location,
  isActive,
  onClick,
}: {
  locationKey: string;
  location: PresetLocation;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    key={locationKey}
    onClick={onClick}
    className={cn(
      "w-full py-2 px-3 mb-1 text-sm font-medium border rounded shadow-sm transition-colors",
      isActive
        ? "bg-green-500 text-white border-green-600"
        : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
    )}
  >
    {location.description}
  </button>
);

// Time Button component
const TimeButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="py-1 px-2 text-xs font-medium bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
  >
    {label}
  </button>
);

export default ControlsPanel;
