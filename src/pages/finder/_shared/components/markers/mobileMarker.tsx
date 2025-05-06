import { Marker, OverlayView } from "@react-google-maps/api";

// Hooks
import useFilters from "../../../../../_shared/hooks/filters/useFilters";
import usePubAreas from "../../../../../_shared/hooks/pubAreas/usePubAreas";

// Types
import { MapReadyMarker } from "../../../../../_shared/hooks/mapMarkers/useMapMarkers";

// Components
import DynamicSunIcon from "../../../../../_shared/components/dynamicSunIcon";

// Helpers
import { getPixelPositionOffset } from "../../helpers";

interface MobileMarkerProps {
  mapMarker: MapReadyMarker;
}

const MobileMarker = ({ mapMarker }: MobileMarkerProps) => {
  // Variables
  const { bestSunPercent = 0, pub } = mapMarker || {};
  const { id: pubId, latitude, longitude } = pub || {};

  // Hooks
  const {
    operations: { onSetSelectedPubById },
  } = usePubAreas();
  const {
    data: { viewFilters },
    operations: { onToggleViewFilters },
  } = useFilters();

  const handleClick = () => {
    onSetSelectedPubById(pubId);
    if (viewFilters) {
      onToggleViewFilters();
    }
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
          className="w-[44px] h-[44px] bg-white rounded-full flex items-center justify-center relative cursor-pointer"
          onClick={handleClick}
          style={{
            ...(bestSunPercent >= 75
              ? { border: "2px solid #FFCC00" }
              : bestSunPercent >= 50
                ? {
                    // For the middle tier, we'll use a pseudo-element with a gradient
                    // The actual styling is handled in the :before pseudo-element
                    position: "relative",
                    border: "2px solid transparent",
                    backgroundClip: "padding-box",
                    boxSizing: "border-box",
                  }
                : { border: "2px solid #b7b7b7" }),
          }}
        >
          {/* Gradient border for middle tier */}
          {bestSunPercent >= 50 && bestSunPercent < 75 && (
            <div
              className="absolute inset-0 rounded-full z-[-1]"
              style={{
                background:
                  "linear-gradient(to right, #FFCC00 50%, #b7b7b7 50%)",
                padding: "2px",
                transform: "rotate(45deg)",
                margin: "-2px",
              }}
            />
          )}

          <DynamicSunIcon
            sunPercent={bestSunPercent}
            className="w-[20px] h-[20px]"
            aria-label="Sun"
          />
        </div>
      </OverlayView>
    </>
  );
};

export default MobileMarker;
