import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState, useEffect } from "react";
import { Marker, OverlayView } from "@react-google-maps/api";

// Assets
import sunLogo from "../../../../../assets/biggerBolderSun.svg";

// Hooks
import usePubs from "../../hooks/usePubs";
import usePubAreas, {
  PubWithAreaAndSunEval,
} from "../../../../areas/identifier/_shared/hooks/usePubAreas";

// Utils
import * as fn from "../../../../../_shared/utils";

// Components
import ShowPubAreas from "./areas";

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

  // Add state to track recently unhovered markers
  const [wasRecentlyHovered, setWasRecentlyHovered] = useState(false);

  // Effect to clear wasRecentlyHovered state after transition completes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (!isPubHovered && wasRecentlyHovered) {
      timeoutId = setTimeout(() => {
        setWasRecentlyHovered(false);
      }, 300); // 300ms is enough for both transitions to complete
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isPubHovered, wasRecentlyHovered]);

  // Update wasRecentlyHovered when hover state changes
  useEffect(() => {
    if (isPubHovered) {
      setWasRecentlyHovered(false);
    }
  }, [isPubHovered]);

  const handleMouseLeave = useCallback(() => {
    if (isPubHovered) {
      setWasRecentlyHovered(true);
    }
    onSetHoveredPubId(0); // Use 0 instead of null as it expects a number
  }, [onSetHoveredPubId, isPubHovered]);

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
            cursor: "pointer",
            width: isPubHovered ? "250px" : "30px",
            height: isPubHovered ? "auto" : "30px",
            minHeight: isPubHovered ? "100px" : "30px",
            maxHeight: isPubHovered ? "300px" : "30px",
            backgroundColor: isPubHovered || wasRecentlyHovered ? "white" : "",
            ...(!isPubHovered &&
              !wasRecentlyHovered &&
              fn.getSunCircleClassFromPercentage(topSunValue) ===
                "sun-half-marker" && {
                background:
                  "linear-gradient(to right, #FFCC00 50%, #e5e7eb 50%)",
                transform: "rotate(45deg)",
              }),
            // Synchronized transition for all properties
            transition: isPubHovered
              ? "width 0.3s ease, height 0.3s ease, min-height 0.3s ease, max-height 0.3s ease, background-color 0.2s ease"
              : "all 0.2s ease",
            border: "1px solid #1e293b", // slate-400
            boxShadow: isPubHovered
              ? "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
              : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            padding: isPubHovered ? "16px" : "0",
            paddingTop: isPubHovered ? "32px" : "0",
            display: "flex",
            flexDirection: "column",
            justifyContent: isPubHovered ? "start" : "center",
            alignItems: isPubHovered ? "start" : "center",
            fontFamily: "Poppins, sans-serif !important",
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
      </OverlayView>
    </>
  );
};

export default CustomMarker;
