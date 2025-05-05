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

  // Effect to toggle between formats based on current time
  useEffect(() => {
    // Function to check if we should show humanized format based on current time
    const checkTimeAndUpdateFormat = () => {
      const now = new Date();
      const seconds = now.getSeconds();
      // Determine if we should show humanized format based on 10-second intervals
      // (0-9 seconds: real time format, 10-19 seconds: humanized format)
      const shouldShowHumanized = Math.floor(seconds / 10) % 2 === 1;

      // Only update if the format has changed to avoid unnecessary re-renders
      if (shouldShowHumanized !== showHumanized) {
        // Step 1: Fade out
        setIsVisible(false);

        // Step 2: After fade out completes, update the content
        setTimeout(() => {
          setShowHumanized(shouldShowHumanized);
          setCurrentText(
            shouldShowHumanized
              ? formatHumanized(minutesLeftInSun)
              : formatRealTime(minutesLeftInSun)
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
