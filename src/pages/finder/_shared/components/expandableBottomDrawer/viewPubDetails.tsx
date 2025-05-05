import { useState, useMemo } from "react";

// Hooks
import usePubAreas from "../../../../../_shared/hooks/pubAreas/usePubAreas";
import useSunEvals from "../../../../../_shared/hooks/sunEvals/useSunEvals";
import useHeroMetrics from "../../../../../_shared/hooks/heroMetrics/useHeroMetrics";
import { usePubAreasContext } from "../../../../../_shared/providers/PubAreasProvider";

// Constants
import { SUN_THRESHOLDS } from "../../../../../_shared/hooks/mapMarkers/useMapMarkers";

// Components
import LocationDetails from "./LocationDetails";
import TimeLeftInTheSun from "./TImeLeftInTheSun";
import PubAreasOverview from "./areas/PubAreasOverview";
import DynamicSunIconWithBorder from "../../../../../_shared/components/DynamicSunIconWithBorder";

// Helpers
import { formatShortAddress } from "../../../../lists/pubs/_shared/helpers";
import { formatTimeSlot } from "../../helpers";
import { formatSunPercentage } from "../../../../../_shared/helpers";

// Icons
import { ChevronLeftIcon, ExternalLink } from "lucide-react";

// Render pub content component
const ViewPubDetails = () => {
  // Local state for content visibility
  const [isVisible, setIsVisible] = useState(true);

  // Hooks
  const {
    data: { selectedPub },
    operations: { onSetSelectedPub },
  } = usePubAreas();

  // Get direct access to context for fallback
  const { updatePubAreasState } = usePubAreasContext();

  const {
    data: { allMapReadyPubs },
  } = useHeroMetrics();

  const {
    data: { sunEvalsForAllPubAreas = [], selectedTimeslot = 0 },
  } = useSunEvals();

  // Handle close with animation
  const handleClose = () => {
    // Step 1: Hide content
    setIsVisible(false);

    // Step 2: After 200ms, process the onSetSelectedPub(null) action
    setTimeout(() => {
      try {
        onSetSelectedPub(null);
      } catch (error) {
        console.error("Error when setting selected pub to null:", error);
        // Fallback: Force a reset of the selected pub ID directly through context
        updatePubAreasState({
          selectedPubId: 0,
          selectedPubArea: null,
        });
      }
    }, 200);
  };

  // Variables
  const { name = "", address_text = "" } = selectedPub || {};

  const selectedPubMarker = allMapReadyPubs.find(
    (marker) => marker.pub.id === selectedPub?.id
  );

  const { bestSunPercent = 0, pubAreas = [] } = selectedPubMarker || {};

  // Calculate the sun eval with the pc_in_sun above SOME_SUN threshold and the highest time value
  const latestSomeSunEval = useMemo(() => {
    if (!sunEvalsForAllPubAreas || sunEvalsForAllPubAreas.length === 0) {
      return null;
    }

    // Find the first evaluation with some sun to use as initial value
    const initialEval = sunEvalsForAllPubAreas.find(
      (sunEval) => sunEval.pc_in_sun >= SUN_THRESHOLDS.SOME
    );

    // If no evals have sun, return null
    if (!initialEval) {
      return null;
    }

    return sunEvalsForAllPubAreas.reduce((prev, current) => {
      if (
        current.pc_in_sun >= SUN_THRESHOLDS.SOME &&
        current.time > prev.time
      ) {
        return current;
      }
      return prev;
    }, initialEval);
  }, [sunEvalsForAllPubAreas]);

  const highestSunPcEval = useMemo(() => {
    if (!sunEvalsForAllPubAreas || sunEvalsForAllPubAreas.length === 0) {
      return null;
    }

    return sunEvalsForAllPubAreas.reduce((prev, current) => {
      if (current.pc_in_sun > prev.pc_in_sun) {
        return current;
      }
      return prev;
    }, sunEvalsForAllPubAreas[0]);
  }, [sunEvalsForAllPubAreas]);

  // Find how many minutes left in the sun between now (selectedTimeslot) and the latestSomeSunEval's time
  const minutesLeftInSun = useMemo(() => {
    if (!latestSomeSunEval) return null;
    // Calculate the difference in timeslots
    const timeslotDifference = latestSomeSunEval.time - (selectedTimeslot || 0);

    // Each timeslot represents 15 minutes
    const minutesLeft = timeslotDifference * 15;
    return minutesLeft > 0 ? minutesLeft : null;
  }, [latestSomeSunEval, selectedTimeslot]);

  return (
    <div
      className={`flex h-[calc(75vh-12px)] flex-col space-between ${isVisible ? "opacity-100" : "opacity-0"} transition-opacity duration-200`}
    >
      <div className="flex flex-col h-[calc(75vh-72px)] overflow-y-auto pt-4">
        {/* Header with pub name and sun icon */}

        <div className="flex flex-row items-center gap-4 mb-8">
          <DynamicSunIconWithBorder sunPercent={bestSunPercent} />
          <div className="flex flex-col">
            <h3 className="text-md font-black font-poppins mb-1">{name}</h3>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address_text)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex flex-row items-center font-normal text-gray-600 font-poppins hover:text-blue-600 hover:underline cursor-pointer"
              aria-label="Open address in Google Maps"
            >
              {formatShortAddress(address_text)}
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </div>
        </div>

        {/* Best sun percentage summary */}
        <h4 className="text-xs font-semibold mb-2">Sun Quality</h4>
        <div className="grid grid-cols-2 gap-2 mb-6 text-xs">
          <div className="flex flex-col p-3 bg-slate-50 rounded-md gap-2">
            <h4 className="font-bold mb-1">Area in the sun</h4>
            <div className="flex items-center gap-1">
              <p className="text-sm font-bold font-poppins">
                {formatSunPercentage(bestSunPercent)}%
              </p>
            </div>
            <p className="text-xs text-slate-600">
              Peak: {formatTimeSlot(highestSunPcEval?.time || 0)} (
              {formatSunPercentage(highestSunPcEval?.pc_in_sun || 0)}%)
            </p>
          </div>
          <div className="flex flex-col p-3 bg-slate-50 rounded-md gap-2">
            <h4 className="font-bold mb-1">In the sun until</h4>
            <div className="flex items-center gap-1">
              <p className="text-sm font-bold font-poppins whitespace-nowrap overflow-hidden">
                {formatTimeSlot(latestSomeSunEval?.time || 0)}
              </p>
            </div>
            {(latestSomeSunEval?.time || 0) > 0 && (
              <TimeLeftInTheSun minutesLeftInSun={minutesLeftInSun || 0} />
            )}
          </div>
        </div>

        <PubAreasOverview pubAreas={pubAreas} />

        <LocationDetails />
      </div>

      <div className="relative flex flex-col h-[50px] justify-start border-l-0 border-r-0 border-b-0 border-t border-2 border-gray-200 shadow-[0_-6px_8px_-4px_rgba(0,0,0,0.1)]">
        {/* White gradient fade effect for scrolling content */}
        <div className="absolute -top-16 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none z-10 border-b-2 border-gray-200"></div>
        <button
          className="w-full flex font-bold text-xs flex-row items-center border-2 border-[#2962ff] justify-center gap-2 p-3 bg-white text-[#2962ff] rounded hover:bg-[#2962ff] hover:text-white transition-colors"
          onClick={handleClose}
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to Map
        </button>
      </div>
    </div>
  );
};

export default ViewPubDetails;
