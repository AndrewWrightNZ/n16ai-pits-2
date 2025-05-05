import { useState, useEffect } from "react";

// Hooks
import useMapMarkers from "../../../../../_shared/hooks/mapMarkers/useMapMarkers";

// Components
import MobileMarker from "./mobileMarker";

const RenderFilteredMarkers = () => {
  // State to track if component is mounted
  const [isMounted, setIsMounted] = useState(true);

  // Hooks
  const {
    data: { filteredBySunQualityMarkers = [] },
  } = useMapMarkers();

  // Set up effect to track component mounting state
  useEffect(() => {
    // Component is mounted
    setIsMounted(true);

    // Cleanup function to run when component unmounts
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Only render markers if we have valid data and component is mounted
  if (
    !isMounted ||
    !filteredBySunQualityMarkers ||
    filteredBySunQualityMarkers.length === 0
  ) {
    return <></>;
  }

  // Safely render markers with error boundary pattern
  try {
    return (
      <>
        {filteredBySunQualityMarkers.map((mapMarker) => (
          <MobileMarker key={mapMarker?.pub?.id} mapMarker={mapMarker} />
        ))}
      </>
    );
  } catch (error) {
    console.error("Error rendering markers:", error);
    return <></>;
  }
};

export default RenderFilteredMarkers;
