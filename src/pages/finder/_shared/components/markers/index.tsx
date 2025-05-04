// Hooks
import useMapMarkers from "../../../../../_shared/hooks/mapMarkers/useMapMarkers";
import useDeviceDetect from "../../../../../_shared/hooks/useDeviceDetect";

// Components
import CustomMarker from "./customMarker";
import MobileMarker from "./mobileMarker";

const RenderFilteredMarkers = () => {
  //

  // Hooks
  const {
    data: { filteredBySunQualityMarkers = [] },
  } = useMapMarkers();

  const { isMobile } = useDeviceDetect();

  return (
    <>
      {isMobile ? (
        <>
          {filteredBySunQualityMarkers?.map((mapMarker) => (
            <MobileMarker key={mapMarker.pub.id} mapMarker={mapMarker} />
          ))}
        </>
      ) : (
        <>
          {filteredBySunQualityMarkers?.map((mapMarker) => (
            <CustomMarker key={mapMarker.pub.id} mapMarker={mapMarker} />
          ))}
        </>
      )}
    </>
  );
};

export default RenderFilteredMarkers;
