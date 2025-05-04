import { Marker, OverlayView } from "@react-google-maps/api";

// Utils
import * as fn from "../../../../../_shared/utils";

// Types
import { MapReadyMarker } from "../../../../../_shared/hooks/mapMarkers/useMapMarkers";

interface MobileMarkerProps {
  mapMarker: MapReadyMarker;
}

const getPixelPositionOffset = (width: number, height: number) => ({
  x: -(width / 2),
  y: -(height / 2),
});

const MobileMarker = ({ mapMarker }: MobileMarkerProps) => {
  // Variables
  const { bestSunPercent = 0, pub } = mapMarker || {};
  const { id: pubId, name, latitude, longitude } = pub || {};

  const handleClick = () => {
    console.log("Mobile marker clicked: ", pubId);
  };

  return (
    <>
      {/* Invisible marker for click handling */}
      <Marker
        position={{
          lat: latitude,
          lng: longitude,
        }}
        onClick={handleClick}
        visible={false}
      />

      {/* Custom overlay for the visual marker */}
      <OverlayView
        position={{
          lat: latitude,
          lng: longitude,
        }}
        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        getPixelPositionOffset={getPixelPositionOffset}
      >
        <div
          className={`flex relative rounded-[20px] overflow-hidden ${fn.getSunCircleClassFromPercentage(bestSunPercent)}`}
          style={{
            zIndex: 1,
            cursor: "pointer",
            width: "30px",
            height: "30px",
            border: "1px solid #1e293b", // slate-400
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontFamily: "Poppins, sans-serif !important",
            ...(fn.getSunCircleClassFromPercentage(bestSunPercent) ===
              "sun-half-marker" && {
              background: "linear-gradient(to right, #FFCC00 50%, #e5e7eb 50%)",
              transform: "rotate(45deg)",
            }),
          }}
          onClick={handleClick}
          title={name}
        />
      </OverlayView>
    </>
  );
};

export default MobileMarker;
