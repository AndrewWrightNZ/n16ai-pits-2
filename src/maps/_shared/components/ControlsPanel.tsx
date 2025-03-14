import { cn } from "../../../utils";
import { PRESET_LOCATIONS, PresetLocation } from "../hooks/locationsData";
import useMapSettings from "../hooks/useMapSettings";

interface ControlsPanelProps {
  formattedTime: string;
  onSetSpecificTime: (hour: number) => void;
}

const ControlsPanel = ({
  formattedTime,
  onSetSpecificTime,
}: ControlsPanelProps) => {
  //

  // Hooks
  const {
    data: {
      // View
      isOrbiting,
      timeSpeed,

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

  return (
    <>
      <div className="absolute top-2.5 left-2.5 bg-white/80 p-2.5 rounded z-10 max-w-[200px]">
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

          {/* Time buttons */}
          <div className="grid grid-cols-3 gap-1 mb-1">
            <TimeButton label="6 AM" onClick={() => onSetSpecificTime(6)} />
            <TimeButton label="12 PM" onClick={() => onSetSpecificTime(12)} />
            <TimeButton label="4 PM" onClick={() => onSetSpecificTime(16)} />
            <TimeButton label="5 PM" onClick={() => onSetSpecificTime(17)} />
            <TimeButton label="6 PM" onClick={() => onSetSpecificTime(18)} />
            <TimeButton label="7 PM" onClick={() => onSetSpecificTime(19)} />
            <TimeButton label="8 PM" onClick={() => onSetSpecificTime(20)} />
            <TimeButton label="9 AM" onClick={() => onSetSpecificTime(9)} />
            <TimeButton label="3 PM" onClick={() => onSetSpecificTime(15)} />
            <TimeButton label="9 PM" onClick={() => onSetSpecificTime(21)} />
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
