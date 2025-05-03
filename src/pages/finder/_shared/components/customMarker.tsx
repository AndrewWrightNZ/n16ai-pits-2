import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Marker, OverlayView } from "@react-google-maps/api";

// Assets
import sunLogo from "../../../../assets/biggerBolderSun.svg";

// Hooks
import usePubs from "../hooks/usePubs";
import usePubAreas, {
  PubWithAreaAndSunEval,
} from "../../../areas/identifier/_shared/hooks/usePubAreas";

// Utils
import * as fn from "../../../../_shared/utils";

// Components
import ShowPubAreas from "./areas";

export interface MarkerInternalsProps {
  children: React.ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const StandardMarkerInternals: React.FC<MarkerInternalsProps> = ({
  children,
  onMouseEnter,
  onClick,
  style,
  className = "",
}) => {
  return (
    <div
      className={`flex relative justify-start items-center w-[30px] h-[30px] bg-amber-300 rounded-[20px] p-[5px] left-0 top-0 border border-slate-800 shadow-lg ${className}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
};

interface CustomMarkerProps {
  pubWithAreas: PubWithAreaAndSunEval;
}

const getPixelPositionOffset = (width: number, height: number) => ({
  x: -(width / 2),
  y: -(height / 2),
});

const CustomMarker = ({ pubWithAreas }: CustomMarkerProps) => {
  //
  // Variables
  const { id: pubId, name, latitude, longitude } = pubWithAreas?.pub || {};
  const { groupedSunEvals = [] } = pubWithAreas || {};

  const areaSunValues = groupedSunEvals.map((area) => area.pc_in_sun || 0);

  //
  // Hooks
  const {
    data: { selectedPub, hoveredPubId, uiReadyPubs = [] },
    operations: { onSetHoveredPubId },
  } = usePubs();

  const {
    operations: { onSetSelectedPub },
  } = usePubAreas();

  //
  // Variables
  const isPubSelected = selectedPub?.id === pubId;
  const isPubHovered = hoveredPubId === pubId;

  const isPubHidden = hoveredPubId && !isPubHovered && !isPubSelected;

  const potentiallyTruncatedName = fn.truncateString(name, 20);

  const topSunValue = areaSunValues.reduce((max, current) =>
    Math.max(max, current)
  );

  // We'll use auto height instead of calculating a specific height

  //
  // Handlers
  const navigate = useNavigate();
  const handleClick = useCallback(() => {
    const pub = uiReadyPubs.find((pub) => pub.id === pubId);

    if (!pub) return;
    onSetSelectedPub(pub);

    // Navigate to /scene
    navigate({ to: "/scene" });
  }, [onSetSelectedPub, pubId, uiReadyPubs, navigate]);

  const handleMouseEnter = useCallback(() => {
    onSetHoveredPubId(pubId);
  }, [onSetHoveredPubId, pubId]);

  const handleMouseLeave = useCallback(() => {
    onSetHoveredPubId(hoveredPubId);
  }, [onSetHoveredPubId, hoveredPubId]);

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
          className={`flex relative fade-in-out translate-y-0 ml-10 rounded-[20px] overflow-hidden ${!isPubHovered ? fn.getSunCircleClassFromPercentage(topSunValue) : ""}`}
          style={{
            zIndex: isPubHovered ? 9999999999 : 1,
            opacity: isPubHidden ? 0.3 : 1,
            cursor: isPubHovered ? "pointer" : "pointer",
            width: isPubHovered ? "250px" : "30px",
            height: isPubHovered ? "auto" : "30px",
            minHeight: isPubHovered ? "100px" : "30px",
            maxHeight: isPubHovered ? "300px" : "30px",
            backgroundColor: isPubHovered ? "white" : "",
            transition:
              "width 0.3s ease, height 0.3s ease, background-color 0.3s ease",
            border: "1px solid #1e293b", // slate-800
            boxShadow: isPubHovered
              ? "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
              : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            padding: isPubHovered ? "16px" : "0",
            paddingTop: isPubHovered ? "32px" : "0",
            display: "flex",
            flexDirection: "column",
            justifyContent: isPubHovered ? "start" : "center",
            alignItems: isPubHovered ? "start" : "center",
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          {/* Content that appears with delay on hover */}
          <div
            style={{
              opacity: isPubHovered ? 1 : 0,
              transition: "opacity 0.4s ease",
              transitionDelay: isPubHovered ? "0.3s" : "0s",
              pointerEvents: isPubHovered ? "auto" : "none",
              marginTop: isPubHovered ? "0" : "-100%",
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <div className="flex flex-row items-center gap-2 color-[#FFCC00]">
              <div
                className="w-[30px] h-[30px]"
                style={{
                  maskImage: `url(${sunLogo})`,
                  WebkitMaskImage: `url(${sunLogo})`,
                  maskSize: "contain",
                  WebkitMaskSize: "contain",
                  backgroundColor: topSunValue >= 75 ? "#FFCC00" : "#e5e7eb",
                }}
                aria-label="Sun"
              />

              <span className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
                {potentiallyTruncatedName}
              </span>
            </div>

            <ShowPubAreas sunEvals={groupedSunEvals} />
          </div>
        </div>
      </OverlayView>
    </>
  );
};

export default CustomMarker;
