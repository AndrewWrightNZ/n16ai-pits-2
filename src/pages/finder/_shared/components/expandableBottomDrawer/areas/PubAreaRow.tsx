import { useEffect, useState } from "react";
import DynamicSunIcon from "../../../../../../_shared/components/dynamicSunIcon";
import { formatSunPercentage } from "../../../../../../_shared/helpers";
import { SimplePubAreaWithSunPc } from "../../../../../../_shared/hooks/mapMarkers/useMapMarkers";
import { formatAreaType } from "../../../../../lists/_shared";
import { formatHumanizedAreaSize } from "../../../helpers";

interface PubAreaRowProps {
  area: SimplePubAreaWithSunPc;
}

const PubAreaRow = ({ area }: PubAreaRowProps) => {
  //

  // State
  const [isVisible, setIsVisible] = useState(true);
  const [humanizeAreaValue, setHumanizeAreaValue] = useState(false);
  const [currentText, setCurrentText] = useState<string>(
    `${(area.floor_area || 0).toFixed(0)} m²`
  );

  //

  // Effects
  useEffect(() => {
    // Function to check if we should show humanized format based on current time
    const checkTimeAndUpdateFormat = () => {
      const now = new Date();
      const seconds = now.getSeconds();
      // Determine if we should show humanized format based on 10-second intervals
      // (0-9 seconds: regular format, 10-19 seconds: humanized format)
      const shouldShowHumanized = Math.floor(seconds / 10) % 2 === 1;

      // Only update if the format has changed to avoid unnecessary re-renders
      if (shouldShowHumanized !== humanizeAreaValue) {
        // Step 1: Fade out
        setIsVisible(false);

        // Step 2: After fade out completes, update the content
        setTimeout(() => {
          setHumanizeAreaValue(shouldShowHumanized);
          setCurrentText(
            shouldShowHumanized
              ? formatHumanizedAreaSize(area.floor_area)
              : `${(area.floor_area || 0).toFixed(0)} m²`
          );

          // Step 3: Fade back in
          setIsVisible(true);
        }, 300); // Match the transition duration
      }
    };

    // Initial check
    checkTimeAndUpdateFormat();

    // Set up a single requestAnimationFrame loop that checks the time
    let animationFrameId: number;

    const updateLoop = () => {
      checkTimeAndUpdateFormat();
      animationFrameId = requestAnimationFrame(updateLoop);
    };

    animationFrameId = requestAnimationFrame(updateLoop);

    // Cleanup on unmount
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [humanizeAreaValue, area.floor_area]);

  //

  // Render
  return (
    <div className="flex flex-row items-center justify-between bg-slate-50 p-3 rounded-md text-xs">
      <div className="flex flex-col justify-start items-start gap-2">
        <span className="font-bold font-poppins">
          {formatAreaType(area.type)}
        </span>

        <p className={`text-slate-600`}>
          Size:{" "}
          <span
            className={`transition-opacity duration-300 ease-in-out ${isVisible ? "opacity-100" : "opacity-0"}`}
          >
            {currentText}
          </span>
        </p>
      </div>
      <div className="font-bold font-poppins">
        <div className="flex items-center gap-1">
          <DynamicSunIcon
            sunPercent={area.pc_in_sun}
            className="w-[30px] h-[30px] mr-2"
          />
          <p className="w-4 mr-2">{formatSunPercentage(area.pc_in_sun)}%</p>
        </div>
      </div>
    </div>
  );
};

export default PubAreaRow;
