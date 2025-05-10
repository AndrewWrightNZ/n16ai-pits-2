import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";

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
import { formatTimeSlot } from "../../helpers";
import { formatShortAddress } from "../../../../lists/pubs/_shared/helpers";
import { formatSunPercentage } from "../../../../../_shared/helpers";

// Icons
import { ChevronRight, ExternalLink, X } from "lucide-react";

// Render pub content component
const ViewPubDetails = () => {
  //

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

  const navigate = useNavigate();

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

  const onViewSunSimulation = () => {
    navigate({ to: "/session" });
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
      <div className="flex flex-col pt-4">
        {/* Header with pub name and sun icon */}
        <div className="flex flex-row items-center justify-between gap-4 pb-4 mb-0 border-b border-slate-200">
          <div className="flex flex-row items-center gap-2">
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
          <div className="flex flex-row items-center justify-end w-[46px]">
            <button
              onClick={handleClose}
              className="bg-gray-50 border-gray-400 p-1 rounded-full text-gray-400"
            >
              <X className="w-6 h-6 mr-2" />
            </button>
          </div>
        </div>

        {/* Best sun percentage summary */}
        <div className="flex flex-col h-[calc(75vh-165px)] overflow-y-auto pt-4">
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

        <div className="flex flex-col items-center justify-center h-[60px]">
          <button
            onClick={onViewSunSimulation}
            className="flex flex-row items-center justify-center bg-white border border-2 w-full h-[40px] cursor-pointer hover:opacity-60 transition-opacity duration-300  border-[#2962FF] p-1 rounded-md text-[#2962FF] font-semibold font-poppins text-sm"
          >
            View live sun simulation <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPubDetails;
