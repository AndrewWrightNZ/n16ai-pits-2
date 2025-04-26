import { useNavigate } from "@tanstack/react-router";

// Hooks
import useMapSettings from "../hooks/useMapSettings";
import { cn } from "../../../../utils";

const ControlsPanel = () => {
  const navigate = useNavigate();
  // Hooks
  const {
    data: {
      // View
      timeSpeed,
      formattedTime,
      timeOfDay,
    },
    operations: { onSetTimeSpeed, onSetTimeOfDay },
  } = useMapSettings();

  // Calculate slider value from timeOfDay
  const getSliderValue = () => {
    const currentTime =
      timeOfDay instanceof Date ? timeOfDay : new Date(timeOfDay);
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return hours * 4 + Math.floor(minutes / 15);
  };

  // Handle slider change - update in real-time
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    const hours = Math.floor(value / 4);
    const minutes = (value % 4) * 15;
    const newTime = new Date();
    newTime.setHours(hours, minutes, 0, 0);
    onSetTimeOfDay(newTime);
  };

  return (
    <div className="absolute top-2.5 left-2.5 bg-white/80 p-2.5 rounded z-10 max-w-[250px]">
      {/* Back Button */}
      <button
        className="mb-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
        onClick={() => navigate({ to: "/finder" })}
        type="button"
      >
        ← Back to Map
      </button>
      {/* Time of day controls */}
      <div className="mb-2.5">
        <p className="font-medium text-sm mb-1">Time: {formattedTime}</p>

        {/* Time slider */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>12 PM</span>
            <span>4 PM</span>
            <span>9 PM</span>
          </div>
          <input
            type="range"
            // 12pm = 48, 9pm = 84
            min="48"
            max="84"
            step="1"
            value={getSliderValue()}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
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
    </div>
  );
};

export default ControlsPanel;
