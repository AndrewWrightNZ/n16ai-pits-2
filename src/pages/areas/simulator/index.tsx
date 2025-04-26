import { useRef, useEffect } from "react";

// Components
import SimplePhotorealisticTilesMap from "../identifier/_shared/components/SimplePhotorealisticTilesMap";

// Hooks
import usePubAreas from "../identifier/_shared/hooks/usePubAreas";
import useMapSettings from "../../scene/_shared/hooks/useMapSettings";

// Constants
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

const PubAreaSimulator = () => {
  //

  // Hooks

  const {
    data: { selectedPub, selectedPubArea },
    operations: { onGoToNextArea },
  } = usePubAreas();

  const {
    data: { timeOfDay, formattedTime },
    operations: { onSetTimeOfDay },
  } = useMapSettings();

  console.log({ selectedPub, selectedPubArea });

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
    if (onGoToNextArea) onGoToNextArea();
  };

  //

  // Variables
  const visionMaskPoints = selectedPubArea?.vision_mask_points || [];

  //

  // Functions
  // Calculate slider value from timeOfDay
  const getSliderValue = () => {
    const currentTime =
      timeOfDay instanceof Date ? timeOfDay : new Date(timeOfDay);
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return hours * 4 + Math.floor(minutes / 15);
  };

  // Handle slider change - update in real-time
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    const hours = Math.floor(value / 4);
    const minutes = (value % 4) * 15;
    const newTime = new Date();
    newTime.setHours(hours, minutes, 0, 0);
    onSetTimeOfDay(newTime);
  };

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
    <div className="w-full h-[100vh] bg-black text-white">
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
      </div>

      <p>
        Add controls below the fold - the simulator can interact with these but
        they wont show in the UI/screenshot
      </p>

      <div className="mt-6 w-1/3">
        <p className="font-medium text-sm mb-1">Time: {formattedTime}</p>

        {/* Time slider */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-200 mb-1">
            <span>12 PM</span>
            <span>4 PM</span>
            <span>9 PM</span>
          </div>
          <input
            type="range"
            // 12pm = 48, 9pm = 84
            min="48"
            max="84"
            step="1"
            value={getSliderValue()}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        {/* Automation buttons for system interaction */}
        <div className="mt-4 flex gap-2" aria-label="automation-controls">
          <button
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded"
            onClick={handleResetTime}
            data-automation="reset-time"
            type="button"
          >
            Reset Time
          </button>
          <button
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded"
            onClick={handleDecTime}
            data-automation="dec-time"
            type="button"
          >
            Dec Time
          </button>
          <button
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded"
            onClick={handleIncTime}
            data-automation="inc-time"
            type="button"
          >
            Inc Time
          </button>
          <button
            className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded"
            onClick={handleGoToNextArea}
            data-automation="go-to-next-area"
            type="button"
          >
            Go to Next Area
          </button>
        </div>
      </div>
    </div>
  );
};

export default PubAreaSimulator;
