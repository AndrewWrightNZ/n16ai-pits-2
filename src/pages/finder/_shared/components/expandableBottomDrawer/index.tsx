import { useEffect, useState, useRef } from "react";

// Hooks
import usePubAreas from "../../../../../_shared/hooks/pubAreas/usePubAreas";
import useFilters from "../../../../../_shared/hooks/filters/useFilters";

// Types
import { Pub } from "../../../../../_shared/types";

// Components
import ViewPubDetails from "./viewPubDetails";
import TimeSliderInternals from "../timeSlider/SliderInternals";
import SelectFilterOptions from "../../components/filters/selectFilterOptions";

const ExpandableBottomDrawer = () => {
  // State for animations
  const [isContentVisible, setIsContentVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeContent, setActiveContent] = useState<
    "pub" | "slider" | "filters" | null
  >(null);
  const prevSelectedPubRef = useRef<Pub | null>(null);
  const prevViewFiltersRef = useRef<boolean>(false);

  // Hooks
  const {
    data: { selectedPub },
  } = usePubAreas();

  const {
    data: { viewFilters },
  } = useFilters();

  // Animation timing constants
  const FADE_DURATION = 200; // ms - how long opacity transitions take
  const HEIGHT_DURATION = 300; // ms - how long height transitions take

  // Handle transitions between states (pub selection or filters view)
  useEffect(() => {
    try {
      const hadPub = prevSelectedPubRef.current !== null;
      const hasPub = selectedPub !== null;
      const hadFilters = prevViewFiltersRef.current;
      const hasFilters = viewFilters;

      // Skip if both pub and filters are unchanged
      if (
        hadPub === hasPub &&
        hadFilters === hasFilters &&
        hasPub === hasFilters
      ) {
        return;
      }

      // Determine the transition type
      const transitionType =
        !hadPub && !hadFilters && (hasPub || hasFilters)
          ? "expand"
          : (hadPub || hadFilters) && !hasPub && !hasFilters
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
              // Determine which content to show
              // Priority: filters > pub > slider
              let newContent = "slider";
              if (hasFilters) {
                newContent = "filters";
              } else if (hasPub) {
                newContent = "pub";
              }

              // Update content type
              setActiveContent(newContent as "pub" | "slider" | "filters");

              // Update height if needed
              if (transitionType !== "update") {
                setIsExpanded(hasPub || hasFilters);
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

      // Update refs for next comparison
      prevSelectedPubRef.current = selectedPub;
      prevViewFiltersRef.current = viewFilters;
    } catch (error) {
      console.error("Error in transition effect:", error);
      // Reset to a safe state
      setIsContentVisible(true);
      setActiveContent("slider");
      setIsExpanded(false);
    }
  }, [selectedPub, viewFilters]);

  // Initialize states based on initial values
  useEffect(() => {
    // Set initial states based on whether we have a selectedPub or filters view
    const hasPub = !!selectedPub;
    const hasFilters = viewFilters;

    // Determine initial expanded state and content type
    setIsExpanded(hasPub || hasFilters);

    // Priority: filters > pub > slider
    let initialContent = "slider";
    if (hasFilters) {
      initialContent = "filters";
    } else if (hasPub) {
      initialContent = "pub";
    }

    setActiveContent(initialContent as "pub" | "slider" | "filters");
    setIsContentVisible(true); // Start with content visible

    // Set initial ref values
    prevSelectedPubRef.current = selectedPub;
    prevViewFiltersRef.current = viewFilters;
  }, []);

  return (
    <div
      className={`transition-all duration-300 ease-in-out fixed bottom-[0px] left-[8px] right-[8px] p-3 pb-0 bg-white shadow-lg border-2 border-slate-800 rounded-t-xl ${isExpanded ? "h-[75vh]" : "h-22 md:h-26"}`}
    >
      <div
        className={`${isContentVisible ? "opacity-100" : "opacity-0"} transition-opacity duration-200 overflow-hidden h-full`}
      >
        {/* Only render one type of content at a time */}
        {activeContent === "pub" && <ViewPubDetails />}
        {activeContent === "slider" && <TimeSliderInternals />}
        {activeContent === "filters" && <SelectFilterOptions />}
      </div>
    </div>
  );
};

export default ExpandableBottomDrawer;
