// Hooks
import { useState } from "react";
import useMapMarkers from "../../../../../_shared/hooks/mapMarkers/useMapMarkers";
import usePubAreas from "../../../../../_shared/hooks/pubAreas/usePubAreas";

// Components
import DynamicSunIcon from "../../../../../_shared/components/dynamicSunIcon";

// Render pub content component
const ViewPubDetails = () => {
  // Local state for content visibility
  const [isVisible, setIsVisible] = useState(true);

  // Hooks
  const {
    data: { selectedPub },
    operations: { onSetSelectedPub },
  } = usePubAreas();

  const {
    data: { mapReadyMarkers },
  } = useMapMarkers();

  // Handle close with animation
  const handleClose = () => {
    // Step 1: Hide content
    setIsVisible(false);

    // Step 2: After 200ms, process the onSetSelectedPub(null) action
    setTimeout(() => {
      onSetSelectedPub(null);
    }, 200);
  };

  // Variables
  const { name = "" } = selectedPub || {};

  const selectedPubMarker = mapReadyMarkers.find(
    (marker) => marker.pub.id === selectedPub?.id
  );

  const { bestSunPercent = 0 } = selectedPubMarker || {};

  console.log("selectedPubMarker", { selectedPubMarker });

  return (
    <div
      className={`pub-content ${isVisible ? "opacity-100" : "opacity-0"} transition-opacity duration-200 pt-2`}
    >
      <div className="flex flex-row items-center gap-2 mb-12">
        <DynamicSunIcon
          sunPercent={bestSunPercent}
          className="w-[40px] h-[40px]"
        />

        <h3 className="text-lg font-bold">{name}</h3>
      </div>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        onClick={handleClose}
      >
        Close Pub View
      </button>
    </div>
  );
};

export default ViewPubDetails;
