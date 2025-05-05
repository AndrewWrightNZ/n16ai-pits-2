import { useEffect, useState, useRef } from "react";

// Hooks
import useSunEvals from "../../../../../_shared/hooks/sunEvals/useSunEvals";
import { formatTimeSlot } from "../../helpers";

// Custom CSS for the slider thumb with white drop shadow
const sliderStyles = `
  /* Styling for webkit browsers (Chrome, Safari, newer Edge) */
  .slider-with-shadow::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #FFCC00;
    cursor: pointer;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.8);
    opacity: 1
  }

  /* Styling for Firefox */
  .slider-with-shadow::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #FFCC00;
    cursor: pointer;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.8);
    border: none;
    opacity: 1
  }
`;

const TimeSlider = () => {
  const {
    data: { selectedTimeslot },
    operations: { onChangeSunEvalsState, onSeedCurrentTimeSlot },
  } = useSunEvals();

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
    <div className="flex flex-col fixed bottom-[0px] left-[8px] w-[calc(100vw-16px)] p-6 bg-[#2962FF] rounded-t-lg shadow-lg">
      {/* Apply custom slider styles */}
      <style dangerouslySetInnerHTML={{ __html: sliderStyles }} />
      <div className="flex w-full gap-4 mt-6">
        {/* Left div (15% width) with time display */}
        <div className="w-[10%] md:w-[100px] flex flex-col justify-center">
          <div className="text-sm text-white mb-2">Today</div>
          <div className="font-black text-white">
            {formatTimeSlot(sliderValue)}
          </div>
        </div>

        {/* Right div (83% width) with slider */}
        <div className="w-[90%] md:w-[calc(100%-100px)] flex items-center relative">
          {/* Tooltip - always visible with arrow */}
          <div
            className="absolute bottom-12 bg-white text-[#2962FF] px-2 py-1 rounded text-sm font-semibold transform -translate-x-1/2 tooltip-with-arrow"
            style={{ left: `${tooltipPosition}%` }}
          >
            {formatTimeSlot(sliderValue)}
            {/* Arrow pointing down */}
            <div className="absolute left-1/2 bottom-[-6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white transform -translate-x-1/2"></div>
          </div>

          <input
            ref={sliderRef}
            type="range"
            min="0"
            max={maxSliderValue}
            value={sliderValue}
            onChange={handleSliderChange}
            onMouseUp={handleSliderRelease}
            onTouchEnd={handleSliderRelease}
            className="w-full h-2 bg-white rounded-lg appearance-none cursor-pointer slider-with-shadow"
          />
        </div>
      </div>
    </div>
  );
};

export default TimeSlider;
