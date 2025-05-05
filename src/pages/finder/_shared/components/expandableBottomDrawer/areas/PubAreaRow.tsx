import { useEffect, useState, useRef } from "react";
import DynamicSunIcon from "../../../../../../_shared/components/dynamicSunIcon";
import { formatSunPercentage } from "../../../../../../_shared/helpers";
import { SimplePubAreaWithSunPc } from "../../../../../../_shared/hooks/mapMarkers/useMapMarkers";
import { formatAreaType } from "../../../../../lists/_shared";

interface PubAreaRowProps {
  area: SimplePubAreaWithSunPc;
}

const formatHumanized = (value: number) => {
  if (value > 200) {
    return "Huge";
  } else if (value > 100) {
    return "Large";
  } else if (value > 50) {
    return "Medium";
  } else if (value > 25) {
    return "Small";
  } else {
    return "Tiny";
  }
};

const PubAreaRow = ({ area }: PubAreaRowProps) => {
  //

  // State
  const [isVisible, setIsVisible] = useState(true);
  const [humanizeAreaValue, setHumanizeAreaValue] = useState(false);
  const [currentText, setCurrentText] = useState<string>(
    `${(area.floor_area || 0).toFixed(0)} m²`
  );

  //

  // Use refs to keep track of timers for safe cleanup
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Effects
  useEffect(() => {
    const toggleFormat = () => {
      // Step 1: Fade out
      setIsVisible(false);

      // Step 2: After fade out completes, update the content
      // Clear any existing timeout first
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      timeoutIdRef.current = setTimeout(() => {
        const nextShowHumanized = !humanizeAreaValue;
        setHumanizeAreaValue(nextShowHumanized);
        setCurrentText(
          nextShowHumanized
            ? formatHumanized(area.floor_area)
            : `${(area.floor_area || 0).toFixed(0)} m²`
        );

        // Step 3: Fade back in
        setIsVisible(true);
      }, 300); // Match the transition duration
    };

    // Clear any existing interval first
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }

    intervalIdRef.current = setInterval(toggleFormat, 5000);

    // Cleanup interval and timeout on unmount
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, [humanizeAreaValue, area.floor_area]);

  //

  // Render
  return (
    <div className="flex flex-row items-center justify-between bg-slate-50 p-3 rounded-md">
      <div className="flex flex-col justify-start items-start gap-3">
        <span className="font-medium">{formatAreaType(area.type)}</span>

        <p className={`text-sm text-slate-600`}>
          Size:{" "}
          <span
            className={`font-medium transition-opacity duration-300 ease-in-out ${isVisible ? "opacity-100" : "opacity-0"}`}
          >
            {currentText}
          </span>
        </p>
      </div>
      <div className="text-sm font-medium">
        <div className="flex items-center gap-1">
          <DynamicSunIcon
            sunPercent={area.pc_in_sun}
            className="w-[20px] h-[20px]"
          />
          {formatSunPercentage(area.pc_in_sun)}%
        </div>
      </div>
    </div>
  );
};

export default PubAreaRow;
