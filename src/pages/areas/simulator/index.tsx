import { useRef, useEffect } from "react";

// Components
import SimplePhotorealisticTilesMap from "../identifier/_shared/components/SimplePhotorealisticTilesMap";

// Hooks
import usePubAreas from "../../../_shared/hooks/pubAreas/usePubAreas";
import useMapSettings from "../../scene/_shared/hooks/useMapSettings";

// Icons
import { ChevronLeft, ChevronRight } from "lucide-react";

// Constants
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

const PubAreaSimulator = () => {
  //

  // Hooks

  const {
    data: { selectedPub, areasForPub, selectedPubArea },
    operations: { onGoToNextArea, onSimulateNextPub },
  } = usePubAreas();

  const {
    data: { timeOfDay, formattedTime },
    operations: { onSetTimeOfDay },
  } = useMapSettings();

  // Refs
  const overlayRef = useRef<HTMLCanvasElement>(null);

  // Automation button handlers
  const handleResetTime = () => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    onSetTimeOfDay(noon);
  };

  const handleIncTime = () => {
    let current =
      timeOfDay instanceof Date ? new Date(timeOfDay) : new Date(timeOfDay);
    current = new Date(current.getTime() + 15 * 60 * 1000);
    onSetTimeOfDay(current);
  };

  const handleDecTime = () => {
    let current =
      timeOfDay instanceof Date ? new Date(timeOfDay) : new Date(timeOfDay);
    current = new Date(current.getTime() - 15 * 60 * 1000);
    onSetTimeOfDay(current);
  };

  const handleGoToNextArea = () => {
    onGoToNextArea();
    handleResetTime();
  };

  const handleGoToNextPub = () => {
    onSimulateNextPub();
    handleResetTime();
  };

  //

  // Variables
  const visionMaskPoints = selectedPubArea?.vision_mask_points || [];

  const isOnLastArea =
    selectedPubArea &&
    selectedPubArea?.id === areasForPub[areasForPub.length - 1]?.id;

  const decTimeDisabled =
    timeOfDay instanceof Date && timeOfDay.getHours() === 12;
  const incTimeDisabled =
    timeOfDay instanceof Date && timeOfDay.getHours() === 21;

  //

  // Effects
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Draw semi-transparent black over the whole canvas
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();

    // If we have a polygon, cut a hole in the mask
    if (visionMaskPoints.length > 1) {
      ctx.save();
      // Set compositing to punch out the polygon area
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(visionMaskPoints[0].x, visionMaskPoints[0].y);
      for (let i = 1; i < visionMaskPoints.length; i++) {
        ctx.lineTo(visionMaskPoints[i].x, visionMaskPoints[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }, [visionMaskPoints]);

  return (
    <div
      className="bg-black text-gray-600"
      style={{
        width: 800,
        height: 600,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "relative",
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          marginBottom: 16,
        }}
      >
        {/* Render the actual 3D scene */}
        <div
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: 1,
            overflow: "hidden",
          }}
        >
          <SimplePhotorealisticTilesMap pageName="simulator" />
        </div>
        {/* Overlay canvas for mask creation */}
        <canvas
          ref={overlayRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            pointerEvents: "auto",
            zIndex: 2,
            cursor: "none",
          }}
        />

        <div className="w-1/3 absolute top-0 right-0 relative z-999999 text-xs">
          <div className="flex flex-row gap-2 p-1 whitespace-nowrap">
            <p id="selected-pub-id">
              {selectedPub?.id ? `p-${selectedPub?.id}` : "p-null"}
            </p>
            <p id="selected-pub-area-id">
              {selectedPubArea?.id ? `a-${selectedPubArea?.id}` : "a-null"}
            </p>
            <p className="font-medium whitespace-nowrap">{formattedTime}</p>
          </div>

          {/* Automation buttons for system interaction */}
          <div className="mt-1 flex gap-2 border border-transparent bg-transparent p-1 rounded text-transparent">
            <button
              className="flex flex-row items-center whitespace-nowrap "
              onClick={handleResetTime}
              id="reset-time"
              type="button"
            >
              Reset Time
            </button>
            <button
              className="flex flex-row items-center whitespace-nowrap"
              onClick={handleDecTime}
              id="dec-time"
              disabled={decTimeDisabled}
              type="button"
            >
              <ChevronLeft className="w-4 h-4" />
              Dec Time
            </button>
            <button
              className="flex flex-row items-center whitespace-nowrap"
              onClick={handleIncTime}
              id="inc-time"
              disabled={incTimeDisabled}
              type="button"
            >
              Inc Time
              <ChevronRight className="w-4 h-4" />
            </button>
            {!isOnLastArea && (
              <button
                className="flex flex-row items-center whitespace-nowrap"
                onClick={handleGoToNextArea}
                id="go-to-next-area"
                type="button"
              >
                Next Area
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <button
              className="flex flex-row items-center whitespace-nowrap"
              type="button"
              id="view-next-pub"
              onClick={handleGoToNextPub}
            >
              Next pub <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PubAreaSimulator;
