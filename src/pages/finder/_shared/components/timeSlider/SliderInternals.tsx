import { useEffect, useState, useRef } from "react";

// Hooks
import useDeviceDetect from "../../../../../_shared/hooks/useDeviceDetect";
import useSunEvals from "../../../../../_shared/hooks/sunEvals/useSunEvals";

// Helpers
import { formatTimeSlot } from "../../helpers";

const TimeSliderInternals = () => {
  //

  // Hooks
  const {
    data: { selectedTimeslot },
    operations: { onChangeSunEvalsState, onSeedCurrentTimeSlot },
  } = useSunEvals();

  const { isMobile } = useDeviceDetect();

  // Local state to track slider value
  const [sliderValue, setSliderValue] = useState<number>(selectedTimeslot || 0);
  const [tooltipPosition, setTooltipPosition] = useState<number>(0);
  const sliderRef = useRef<HTMLInputElement>(null);

  // Effects
  useEffect(() => {
    if (selectedTimeslot === null) {
      onSeedCurrentTimeSlot();
    }
  }, []);

  // Update local slider value when selectedTimeslot changes
  useEffect(() => {
    if (selectedTimeslot !== null) {
      setSliderValue(selectedTimeslot);
    }
  }, [selectedTimeslot]);

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setSliderValue(newValue);
    updateTooltipPosition(newValue);
  };

  // Calculate tooltip position based on slider value
  const updateTooltipPosition = (value: number) => {
    if (sliderRef.current) {
      const slider = sliderRef.current;
      const min = parseInt(slider.min || "0", 10);
      const max = parseInt(slider.max || "36", 10);

      // Get the actual width of the slider track
      const sliderRect = slider.getBoundingClientRect();

      // Calculate the position in pixels first
      const valueRange = max - min;
      const pixelsPerUnit = sliderRect.width / valueRange;
      const pixelPosition = (value - min) * pixelsPerUnit;

      // Convert to percentage of the slider width
      const percentage = (pixelPosition / sliderRect.width) * 100;

      setTooltipPosition(percentage);
    }
  };

  // Update tooltip position on window resize
  useEffect(() => {
    const handleResize = () => updateTooltipPosition(sliderValue);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sliderValue]);

  // Update tooltip position when slider value changes
  useEffect(() => {
    updateTooltipPosition(sliderValue);
  }, [sliderValue]);

  // Handle slider release - update the global state
  const handleSliderRelease = () => {
    onChangeSunEvalsState({ selectedTimeslot: sliderValue });
  };

  // Calculate the max value for the slider (36 = 9pm)
  const maxSliderValue = 36; // 9pm

  return (
    <div className="flex w-full gap-4 mt-2 md:mt-6 md:px-4">
      {/* Left div (20% width) with time display */}
      <div className="w-[20%] md:w-[100px] flex flex-col justify-center">
        <div className="text-sm mb-2">Today</div>
        <div className="font-black">{formatTimeSlot(sliderValue)}</div>
      </div>

      {/* Right div (80% width) with slider */}
      <div className="w-[80%] md:w-[calc(100%-100px)] flex items-center relative">
        {/* Tooltip - always visible with arrow */}
        {!isMobile && (
          <div
            className="absolute bottom-12 px-2 py-1 rounded text-sm font-semibold transform -translate-x-1/2 tooltip-with-arrow"
            style={{ left: `${tooltipPosition}%` }}
          >
            {formatTimeSlot(sliderValue)}
            {/* Arrow pointing down */}
            <div className="absolute left-1/2 bottom-[-6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] transform -translate-x-1/2"></div>
          </div>
        )}

        <input
          ref={sliderRef}
          type="range"
          min="0"
          max={maxSliderValue}
          value={sliderValue}
          onChange={handleSliderChange}
          onMouseUp={handleSliderRelease}
          onTouchEnd={handleSliderRelease}
          className="w-full h-2 rounded-lg cursor-pointer slider-with-shadow bg-gray-300"
        />
      </div>
    </div>
  );
};

export default TimeSliderInternals;
