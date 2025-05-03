import { useCallback, useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { createPortal } from "react-dom";

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

// Custom OverlayView component since @vis.gl/react-google-maps doesn't provide one
interface CustomOverlayViewProps {
  position: google.maps.LatLngLiteral;
  children: React.ReactNode;
}

const CustomOverlayView: React.FC<CustomOverlayViewProps> = ({
  position,
  children,
}) => {
  const map = useMap();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map) return;

    const containerDiv = document.createElement("div");
    setContainer(containerDiv);
    containerRef.current = containerDiv;

    class Overlay extends google.maps.OverlayView {
      position: google.maps.LatLngLiteral;

      constructor(position: google.maps.LatLngLiteral) {
        super();
        this.position = position;
      }

      onAdd() {
        const panes = this.getPanes();
        panes?.overlayMouseTarget.appendChild(containerDiv);
      }

      draw() {
        const projection = this.getProjection();
        if (!projection) return;

        const point = projection.fromLatLngToDivPixel(
          new google.maps.LatLng(position)
        );
        if (!point) return;

        containerDiv.style.position = "absolute";
        containerDiv.style.left = `${point.x}px`;
        containerDiv.style.top = `${point.y}px`;
        containerDiv.style.transform = "translate(-50%, -50%)";
      }

      onRemove() {
        if (containerRef.current?.parentNode) {
          containerRef.current.parentNode.removeChild(containerRef.current);
        }
        containerRef.current = null;
      }
    }

    const overlay = new Overlay(position);
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
  }, [map, position]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.draw();
    }
  }, [position]);

  return container ? createPortal(children, container) : null;
};

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
    // Only set the hovered pub ID if it's not already hovered
    // This prevents unnecessary re-renders and flickering
    if (!isPubHovered) {
      // Ensure animation state is set before changing hover state
      setIsAnimating(true);
      onSetHoveredPubId(pubId);
    }
  }, [onSetHoveredPubId, pubId, isPubHovered]);

  // Add state to track recently unhovered markers and animation state
  const [wasRecentlyHovered, setWasRecentlyHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to handle animation state and transitions
  useEffect(() => {
    // Clear any existing timeouts when state changes
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    if (isPubHovered) {
      // When hovering, immediately set animating state
      setIsAnimating(true);
      setWasRecentlyHovered(false);
    } else if (wasRecentlyHovered) {
      // When unhovered but was recently hovered, maintain animation state
      // for the full transition duration
      setIsAnimating(true);

      // Set a timeout to clear the animation state after transition completes
      animationTimeoutRef.current = setTimeout(() => {
        setWasRecentlyHovered(false);
        setIsAnimating(false);
      }, 400); // Slightly longer than transition duration to ensure completion
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [isPubHovered, wasRecentlyHovered]);

  const handleMouseLeave = useCallback(() => {
    if (isPubHovered) {
      // Set the recently hovered state to maintain expanded appearance during transition
      setWasRecentlyHovered(true);
      setIsAnimating(true);

      // Delay clearing the hover state slightly to ensure smooth transition
      requestAnimationFrame(() => {
        onSetHoveredPubId(0); // Use 0 instead of null as it expects a number
      });
    }
  }, [onSetHoveredPubId, isPubHovered]);

  return (
    <>
      {/* Click handler using AdvancedMarker with empty content */}
      <AdvancedMarker
        position={{
          lat: latitude,
          lng: longitude,
        }}
        onClick={handleClick}
      >
        <div style={{ width: 0, height: 0 }} />
      </AdvancedMarker>

      {/* Custom overlay for the visual marker */}
      <CustomOverlayView
        position={{
          lat: latitude,
          lng: longitude,
        }}
      >
        <div
          className={`flex relative fade-in-out translate-y-0 ml-10 rounded-[20px] overflow-hidden ${!isPubHovered ? fn.getSunCircleClassFromPercentage(topSunValue) : ""}`}
          style={{
            zIndex: isPubHovered ? 9999999999 : 1,
            opacity: isPubHidden ? 0.3 : 1,
            cursor: "pointer",
            width: isPubHovered || wasRecentlyHovered ? "250px" : "30px",
            height: isPubHovered || wasRecentlyHovered ? "auto" : "30px",
            minHeight: isPubHovered || wasRecentlyHovered ? "100px" : "30px",
            maxHeight: isPubHovered || wasRecentlyHovered ? "300px" : "30px",
            backgroundColor: isPubHovered || wasRecentlyHovered ? "white" : "",
            ...(!isPubHovered &&
              !wasRecentlyHovered &&
              fn.getSunCircleClassFromPercentage(topSunValue) ===
                "sun-half-marker" && {
                background:
                  "linear-gradient(to right, #FFCC00 50%, #e5e7eb 50%)",
                transform: "rotate(45deg)",
              }),
            // Use a single consistent transition for all states
            transition:
              "width 0.3s ease-out, height 0.3s ease-out, min-height 0.3s ease-out, max-height 0.3s ease-out, background-color 0.3s ease-out, transform 0.3s ease-out, padding 0.3s ease-out",
            willChange: isAnimating
              ? "width, height, min-height, max-height, background-color, transform, padding"
              : "auto",
            border: "1px solid #1e293b", // slate-400
            boxShadow: isPubHovered
              ? "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
              : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            padding: isPubHovered || wasRecentlyHovered ? "16px" : "0",
            paddingTop: isPubHovered || wasRecentlyHovered ? "32px" : "0",
            display: "flex",
            flexDirection: "column",
            justifyContent:
              isPubHovered || wasRecentlyHovered ? "start" : "center",
            alignItems: isPubHovered || wasRecentlyHovered ? "start" : "center",
            fontFamily: "Poppins, sans-serif !important",
            transform:
              !isPubHovered &&
              !wasRecentlyHovered &&
              fn.getSunCircleClassFromPercentage(topSunValue) ===
                "sun-half-marker"
                ? "rotate(45deg)"
                : "rotate(0deg)",
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          {/* Content that appears with delay on hover */}
          <div
            style={{
              opacity: isPubHovered || wasRecentlyHovered ? 1 : 0,
              transition: "opacity 0.3s ease-out, margin-top 0.3s ease-out",
              transitionDelay: isPubHovered ? "0.15s" : "0s",
              pointerEvents:
                isPubHovered || wasRecentlyHovered ? "auto" : "none",
              marginTop: isPubHovered || wasRecentlyHovered ? "0" : "-100%",
              width: "100%",
              height: "100%",
              overflow: "hidden",
              fontFamily: "Poppins, sans-serif !important",
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
                  ...(topSunValue >= 75
                    ? { backgroundColor: "#FFCC00" }
                    : topSunValue >= 50
                      ? {
                          background:
                            "linear-gradient(to right, #FFCC00 50%, #e5e7eb 50%)",
                          transform: "rotate(45deg)",
                        }
                      : { backgroundColor: "#e5e7eb" }),
                }}
                aria-label="Sun"
              />

              <p
                className="text-[0.8rem] font-poppins font-black text-black-800 mx-1 flex items-center whitespace-nowrap"
                style={{ fontFamily: "Poppins !important" }}
              >
                {potentiallyTruncatedName}
              </p>
            </div>

            <ShowPubAreas sunEvals={groupedSunEvals} />
          </div>
        </div>
      </CustomOverlayView>
    </>
  );
};

export default CustomMarker;
