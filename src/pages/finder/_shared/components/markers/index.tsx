import { useState, useEffect } from "react";

// Hooks
import useMapMarkers from "../../../../../_shared/hooks/mapMarkers/useMapMarkers";
import useDeviceDetect from "../../../../../_shared/hooks/useDeviceDetect";

// Components
import CustomMarker from "./customMarker";
import MobileMarker from "./mobileMarker";

const RenderFilteredMarkers = () => {
  // State to track if component is mounted
  const [isMounted, setIsMounted] = useState(true);

  // Hooks
  const {
    data: { filteredBySunQualityMarkers = [] },
  } = useMapMarkers();

  const { isMobile } = useDeviceDetect();

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
    return null;
  }

  // Safely render markers with error boundary pattern
  try {
    return (
      <>
        {isMobile ? (
          <>
            {filteredBySunQualityMarkers.map((mapMarker) =>
              mapMarker && mapMarker.pub && mapMarker.pub.id ? (
                <MobileMarker key={mapMarker.pub.id} mapMarker={mapMarker} />
              ) : null
            )}
          </>
        ) : (
          <>
            {filteredBySunQualityMarkers.map((mapMarker) =>
              mapMarker && mapMarker.pub && mapMarker.pub.id ? (
                <CustomMarker key={mapMarker.pub.id} mapMarker={mapMarker} />
              ) : null
            )}
          </>
        )}
      </>
    );
  } catch (error) {
    console.error("Error rendering markers:", error);
    return null;
  }
};

export default RenderFilteredMarkers;
