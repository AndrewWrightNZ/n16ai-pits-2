import { useMemo } from "react";

// Hooks
import useMapMarkers from "../../../../../_shared/hooks/mapMarkers/useMapMarkers";

// Components
import PubListRow from "./pubListRow";
import useSunEvals from "../../../../../_shared/hooks/sunEvals/useSunEvals";
import { formatTimeSlot } from "../../helpers";

const ViewPubsInMapBoundsAsList = () => {
  //

  // Hooks
  const {
    data: { selectedTimeslot = 0 },
  } = useSunEvals();
  const {
    data: { mapReadyMarkers = [] },
  } = useMapMarkers();

  //

  // Variables

  const sortedMarkers = useMemo(() => {
    return mapReadyMarkers.sort((a, b) => b.bestSunPercent - a.bestSunPercent);
  }, [mapReadyMarkers]);

  //

  // Render
  return (
    <div className="flex flex-col gap-2 pt-4">
      <p className="text-lg font-black font-poppins">Your sunniest Pubs</p>
      <p className="text-xs font-normal text-slate-600 mb-2">
        Showing sunniest to least sunny for{" "}
        <strong>{formatTimeSlot(selectedTimeslot || 0)}</strong> today
      </p>

      <div className="relative flex flex-col items-start justify-start h-[calc(75vh-70px)] border-t border-slate-200 overflow-y-auto pb-20 pt-4">
        {sortedMarkers.map((marker) => {
          return <PubListRow key={marker.pub.id} marker={marker} />;
        })}
      </div>
    </div>
  );
};

export default ViewPubsInMapBoundsAsList;
