// Hooks
import useMapMarkers from "../../../../../_shared/hooks/mapMarkers/useMapMarkers";

// Components
import MobileMarker from "./mobileMarker";

const RenderFilteredMarkers = () => {
  // Hooks
  const {
    data: { filteredBySunQualityMarkers = [] },
  } = useMapMarkers();

  return (
    <>
      {filteredBySunQualityMarkers.map((mapMarker) => (
        <MobileMarker key={mapMarker?.pub?.id} mapMarker={mapMarker} />
      ))}
    </>
  );
};

export default RenderFilteredMarkers;
