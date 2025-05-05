import { useState, useEffect, useRef } from "react";

// Helpers
import { formatHumanized, formatRealTime } from "../../helpers";

interface TimeLeftInTheSunProps {
  minutesLeftInSun: number;
}

const TimeLeftInTheSun = ({ minutesLeftInSun }: TimeLeftInTheSunProps) => {
  // State to toggle between humanized and real time formats
  const [showHumanized, setShowHumanized] = useState(false);
  // State to control the fade transition
  const [isVisible, setIsVisible] = useState(true);
  // State to hold the current text content
  const [currentText, setCurrentText] = useState(
    formatRealTime(minutesLeftInSun)
  );

  // Use refs to keep track of timers for safe cleanup
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to toggle between formats every 5 seconds
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
        const nextShowHumanized = !showHumanized;
        setShowHumanized(nextShowHumanized);
        setCurrentText(
          nextShowHumanized
            ? formatHumanized(minutesLeftInSun)
            : formatRealTime(minutesLeftInSun)
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
  }, [showHumanized, minutesLeftInSun]);

  // Update the text when minutesLeftInSun changes
  useEffect(() => {
    // Only update if the component is still mounted
    // This is a synchronous update so we don't need cleanup like with setTimeout
    setCurrentText(
      showHumanized
        ? formatHumanized(minutesLeftInSun)
        : formatRealTime(minutesLeftInSun)
    );
  }, [minutesLeftInSun, showHumanized]);

  return (
    <div>
      <p
        className={`text-xs text-slate-600 transition-opacity duration-300 ease-in-out ${isVisible ? "opacity-100" : "opacity-0"}`}
      >
        {currentText}
      </p>
    </div>
  );
};

export default TimeLeftInTheSun;
