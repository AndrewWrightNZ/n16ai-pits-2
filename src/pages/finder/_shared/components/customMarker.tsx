import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Marker, OverlayView } from "@react-google-maps/api";

// Hooks
import usePubs from "../hooks/usePubs";
import usePubAreas, {
  PubWithAreaAndSunEval,
} from "../../../areas/identifier/_shared/hooks/usePubAreas";

// Utils
import * as fn from "../../../../_shared/utils";

// Components
import React from "react";

// Icons
import { ChevronRight } from "lucide-react";
import { formatAreaType } from "../../../lists/_shared";

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

  console.log({ groupedSunEvals });

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
          className={`flex relative translate-y-0 ml-10 w-[35px] h-[30px] rounded-[20px]`}
          style={{
            zIndex: isPubHovered ? 9999999999 : 1,
            opacity: isPubHidden ? 0.3 : 1,
            transition: "all ease-in-out 0.1s",
            cursor: "pointer",
          }}
        >
          {isPubHovered ? (
            <div
              className={`flex flex-col absolute justify-start items-start gap-6 w-[250px] bg-white text-slate-800 rounded-[20px] p-4 h-[150px] border border-slate-800 shadow-xl left-0 top-0 hover:cursor-pointer`}
              onMouseLeave={handleMouseLeave}
              onClick={handleClick}
            >
              <span className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
                {potentiallyTruncatedName}
                <ChevronRight size={16} />
              </span>

              <div className="flex flex-col items-start gap-2">
                {groupedSunEvals.map((sunValue, index) => (
                  <div
                    key={index}
                    className="flex flex-row justify-start items-center"
                  >
                    <div
                      className={`h-[15px] w-[15px] ml-[2px] rounded-full ${fn.getSunCircleClassFromPercentage(sunValue.pc_in_sun)}`}
                      aria-label={`Sun indicator: ${sunValue.pc_in_sun}%`}
                    />

                    <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
                      {sunValue.pc_in_sun}%
                    </p>

                    <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
                      {formatAreaType(sunValue.pubArea.type)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <StandardMarkerInternals
              onMouseEnter={handleMouseEnter}
              onClick={handleClick}
              className={fn.getSunCircleClassFromPercentage(topSunValue)}
            >
              <div
                className={`h-[15px] w-[15px] ml-[2px] rounded-full ${fn.getSunCircleClassFromPercentage(topSunValue)}`}
                aria-label={`Sun indicator: ${topSunValue}%`}
              />
            </StandardMarkerInternals>
          )}
        </div>
      </OverlayView>
    </>
  );
};

export default CustomMarker;
