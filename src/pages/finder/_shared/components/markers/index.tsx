// Hooks
import useMapMarkers from "../../../../../_shared/hooks/mapMarkers/useMapMarkers";

// Components
import CustomMarker from "./customMarker";

const RenderFilteredMarkers = () => {
  //

  // Hooks
  const {
    data: { filteredBySunQualityMarkers = [] },
  } = useMapMarkers();

  return (
    <>
      {filteredBySunQualityMarkers?.map((mapMarker) => (
        <CustomMarker key={mapMarker.pub.id} mapMarker={mapMarker} />
      ))}
    </>
  );
};

export default RenderFilteredMarkers;
