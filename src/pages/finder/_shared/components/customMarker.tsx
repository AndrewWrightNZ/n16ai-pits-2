import { useCallback } from "react";
import { Marker, OverlayView } from "@react-google-maps/api";

// Types
import { Pub } from "../../../../_shared/types";

// Hooks
import usePubs from "../hooks/usePubs";

// Utils
import * as fn from "../../../../_shared/utils";

// Components
import React from "react";
import { ChevronRight } from "lucide-react";

interface MarkerWrapperProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  sx?: any; // For compatibility with previous code
}

export const ExpandedMarkerWrapper: React.FC<MarkerWrapperProps> = ({
  children,
  style,
  className = "",
  sx = {},
}) => {
  return (
    <div
      className={`flex relative translate-y-0 ml-10 w-[35px] h-[30px] rounded-[20px] ${className}`}
      style={{ ...style, ...sx }}
    >
      {children}
    </div>
  );
};

interface MarkerInternalsProps {
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
      className={`flex relative justify-start items-center w-[30px] h-[30px] bg-white rounded-[20px] p-[5px] left-0 top-0 border border-gray-500 shadow-lg ${className}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
};

export const ExpandedMarkerInternals: React.FC<MarkerInternalsProps> = ({
  children,
  onMouseLeave,
  onClick,
  style,
  className = "",
}) => {
  return (
    <div
      className={`flex absolute justify-start items-center w-fit bg-white rounded-[20px] p-[5px] h-[30px] border border-gray-500 shadow-xl left-0 top-0 hover:cursor-pointer ${className}`}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
};

// Also convert the MarkerNameText component
export const MarkerNameText: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <span className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
      {children}
    </span>
  );
};

interface CustomMarkerProps {
  pubDetails: Pub;
  filterName: string;
}

const getPixelPositionOffset = (width: number, height: number) => ({
  x: -(width / 2),
  y: -(height / 2),
});

const CustomMarker = ({ pubDetails, filterName }: CustomMarkerProps) => {
  //
  // Variables
  const { id: pubId, name, latitude, longitude } = pubDetails || {};

  //
  // Hooks
  const {
    data: { selectedPub, hoveredPubId },
    operations: { onSetSelectedPubId, onSetHoveredPubId },
  } = usePubs();

  //
  // Variables
  const isPubSelected = selectedPub?.id === pubId;
  const isPubHovered = hoveredPubId === pubId;

  const isPubHidden = hoveredPubId && !isPubHovered && !isPubSelected;

  const { eval: currentSunEval = "full_sun" } = {};

  const markerEmoji = fn.selectCorrectEmoji({
    isPubSelected,
    currentSunEval,
    filterName,
  });

  const potentiallyTruncatedName = fn.truncateString(name, 20);

  //
  // Handlers
  const handleClick = useCallback(() => {
    onSetSelectedPubId(pubId);
  }, [onSetSelectedPubId, pubId]);

  const handleMouseEnter = useCallback(() => {
    onSetHoveredPubId(pubId);
  }, [onSetHoveredPubId, pubId]);

  const handleMouseLeave = useCallback(() => {
    onSetHoveredPubId(hoveredPubId);
  }, [onSetHoveredPubId, hoveredPubId]);

  // Create an invisible marker for handling click events
  // The actual visual content will be in the OverlayView
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
        <ExpandedMarkerWrapper
          sx={{
            zIndex: isPubHovered ? 9999999999 : 1,
            opacity: isPubHidden ? 0.3 : 1,
            transition: "all ease-in-out 0.1s",
            cursor: "pointer",
          }}
        >
          {isPubHovered ? (
            <ExpandedMarkerInternals
              onMouseLeave={handleMouseLeave}
              onClick={handleClick}
            >
              <img
                src={markerEmoji}
                alt="Sun or no sun emoji"
                className="h-[15px] w-[15px] ml-[2.5px]"
              />
              <MarkerNameText>
                {potentiallyTruncatedName}
                <ChevronRight size={16} />
              </MarkerNameText>
            </ExpandedMarkerInternals>
          ) : (
            <StandardMarkerInternals
              onMouseEnter={handleMouseEnter}
              onClick={handleClick}
            >
              <img
                src={markerEmoji}
                alt="Sun or no sun emoji"
                className="h-[15px] w-[15px] ml-[2.5px]"
              />
            </StandardMarkerInternals>
          )}
        </ExpandedMarkerWrapper>
      </OverlayView>
    </>
  );
};

export default CustomMarker;
