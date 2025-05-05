import { useEffect, useState, useRef } from "react";

// Hooks
import usePubAreas from "../../../../../_shared/hooks/pubAreas/usePubAreas";

// Types
import { Pub } from "../../../../../_shared/types";

// Components
import ViewPubDetails from "./viewPubDetails";
import TimeSliderInternals from "../timeSlider/SliderInternals";

const ExpandableBottomDrawer = () => {
  // State for animations
  const [isContentVisible, setIsContentVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeContent, setActiveContent] = useState<"pub" | "slider" | null>(
    null
  );
  const prevSelectedPubRef = useRef<Pub | null>(null);

  // Hooks
  const {
    data: { selectedPub },
  } = usePubAreas();

  // Animation timing constants
  const FADE_DURATION = 200; // ms - how long opacity transitions take
  const HEIGHT_DURATION = 300; // ms - how long height transitions take

  // Handle transitions between pub states
  useEffect(() => {
    try {
      const hadPub = prevSelectedPubRef.current !== null;
      const hasPub = selectedPub !== null;

      // Determine the transition type
      const transitionType =
        !hadPub && hasPub
          ? "expand"
          : hadPub && !hasPub
            ? "collapse"
            : "update";

      // Common animation pattern for all transitions
      const animateTransition = () => {
        try {
          // Step 1: Hide content
          setIsContentVisible(false);

          // Step 2: After content is hidden, update what needs to change
          setTimeout(() => {
            try {
              // Update content type
              setActiveContent(hasPub ? "pub" : "slider");

              // Update height if needed
              if (transitionType !== "update") {
                setIsExpanded(hasPub);
              }

              // Step 3: After height transition completes (if any), show content
              const showContentDelay =
                transitionType !== "update" ? HEIGHT_DURATION : 0;
              setTimeout(() => {
                try {
                  setIsContentVisible(true);
                } catch (error) {
                  console.error("Error in final animation step:", error);
                  // Ensure content becomes visible even if there's an error
                  setIsContentVisible(true);
                }
              }, showContentDelay);
            } catch (error) {
              console.error("Error during content type update:", error);
              // Fallback: ensure we at least show some content
              setActiveContent("slider");
              setIsExpanded(false);
              setIsContentVisible(true);
            }
          }, FADE_DURATION);
        } catch (error) {
          console.error("Error starting animation transition:", error);
          // Fallback to a safe state
          setIsContentVisible(true);
        }
      };

      // Run the animation
      animateTransition();

      // Update ref for next comparison
      prevSelectedPubRef.current = selectedPub;
    } catch (error) {
      console.error("Error in transition effect:", error);
      // Reset to a safe state
      setIsContentVisible(true);
      setActiveContent("slider");
      setIsExpanded(false);
    }
  }, [selectedPub]);

  // Initialize states based on initial selectedPub value
  useEffect(() => {
    // Set initial states based on whether we have a selectedPub
    const hasPub = !!selectedPub;
    setIsExpanded(hasPub);
    setActiveContent(hasPub ? "pub" : "slider");
    setIsContentVisible(true); // Start with content visible
    prevSelectedPubRef.current = selectedPub;
  }, []);

  return (
    <div
      className={`transition-all duration-300 ease-in-out fixed bottom-[0px] left-[8px] right-[8px] p-3 pb-0 bg-white shadow-lg border-2 border-slate-800 rounded-t-xl ${isExpanded ? "h-[75vh]" : "h-32"}`}
    >
      <div
        className={`${isContentVisible ? "opacity-100" : "opacity-0"} transition-opacity duration-200 overflow-hidden h-full`}
      >
        {/* Only render one type of content at a time */}
        {activeContent === "pub" && <ViewPubDetails />}
        {activeContent === "slider" && <TimeSliderInternals />}
      </div>
    </div>
  );
};

export default ExpandableBottomDrawer;
