import { useState, useEffect } from "react";

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

  // Effect to toggle between formats every 5 seconds
  useEffect(() => {
    const toggleFormat = () => {
      // Step 1: Fade out
      setIsVisible(false);

      // Step 2: After fade out completes, update the content
      setTimeout(() => {
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

    const intervalId = setInterval(toggleFormat, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [showHumanized, minutesLeftInSun]);

  // Update the text when minutesLeftInSun changes
  useEffect(() => {
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
