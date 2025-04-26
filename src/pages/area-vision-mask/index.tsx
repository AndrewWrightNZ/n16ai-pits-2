import { useNavigate } from "@tanstack/react-router";
import React, { useRef, useEffect, useState } from "react";

// Icons
import { Check, ChevronLeft, ChevronRight, Circle } from "lucide-react";

// Components
import SimplePhotorealisticTilesMap from "../area-identifier/_shared/components/SimplePhotorealisticTilesMap";

// Hooks
import usePubAreas from "../area-identifier/_shared/hooks/usePubAreas";

// Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const PubAreaVisionMask = () => {
  //

  // Hooks
  const navigate = useNavigate();
  const {
    data: { isSavingVisionMask, selectedPubArea, selectedPub, areasForPub },
    operations: {
      onGoToNextArea,
      onGoToPreviousArea,
      onSaveMask,
      onGoToNextPub,
    },
  } = usePubAreas();

  // Refs
  const overlayRef = useRef<HTMLCanvasElement>(null);

  // State
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);

  //

  // Variables
  const isSaveDisabled = points.length < 3;

  // make disabled unless all have area.vision_mask_points?.length
  const isNextPubDisabled = areasForPub.some((area) => {
    return !area.vision_mask_points?.length;
  });

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
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();

    // If we have a polygon, cut a hole in the mask
    if (points.length > 1) {
      ctx.save();
      // Set compositing to punch out the polygon area
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Draw points on top
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ff0000";
    for (const pt of points) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }, [points]);

  // Handlers
  const handleOverlayClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints([...points, { x, y }]);
  };

  const handleReset = () => setPoints([]);

  const handleSaveMask = () => {
    // Save the mask
    onSaveMask(points);

    // Reset points
    handleReset();
  };

  const handleGoToNextPub = () => {
    // Update the pub to show that it has been masked
    onGoToNextPub();

    // Reset points
    handleReset();
  };

  return (
    <div className="w-full h-[100vh] bg-black text-white p-4 rounded">
      <button
        onClick={() => navigate({ to: "/finder" })}
        className="flex items-center gap-2 mb-4"
      >
        <ChevronLeft className="w-6 h-6" />
        back to map
      </button>
      <p className="mb-2">Set up Pub Area Vision Mask</p>

      <p className="mb-2 text-sm">{selectedPub?.name}</p>

      <div className="flex flex-row items-start gap-2 justify-start">
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
            <SimplePhotorealisticTilesMap pageName="create-mask" />
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
              cursor: "crosshair",
            }}
            onClick={handleOverlayClick}
          />
        </div>

        <div className="flex flex-col items-start justify-start">
          <p className="text-sm mb-4">Areas to mask:</p>

          {areasForPub.map(({ id, name, vision_mask_points }) => (
            <div key={id} className="flex flex-row items-center gap-2">
              {vision_mask_points ? <Check /> : <Circle />}
              <p>
                {name}
                {vision_mask_points?.length
                  ? ` (${vision_mask_points?.length})`
                  : ""}
              </p>
            </div>
          ))}

          <button
            disabled={isNextPubDisabled}
            onClick={handleGoToNextPub}
            className="flex flex-row cursor-pointer items-center px-4 py-2 bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            Go to next pub
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className="mt-2 text-sm">{selectedPubArea?.name}</div>

      <div className="mt-2 text-sm">
        {selectedPubArea?.vision_mask_points?.length
          ? `Mask Saved (${selectedPubArea?.vision_mask_points?.length} points)`
          : "No Mask"}
      </div>

      <div className="mt-2 flex flex-row items-center gap-2">
        <button
          onClick={onGoToPreviousArea}
          disabled={!!points.length}
          className="px-4 py-1 bg-gray-700 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous Area
        </button>
        <button
          onClick={onGoToNextArea}
          disabled={!!points.length}
          className="px-4 py-1 bg-gray-700 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Area
        </button>
      </div>
      <div className="mt-2 flex flex-row items-center gap-2">
        <button
          onClick={handleReset}
          className="px-4 py-1 bg-gray-700 rounded cursor-pointer"
        >
          Reset Mask
        </button>

        <button
          onClick={handleSaveMask}
          disabled={isSaveDisabled}
          className="px-4 py-1 bg-gray-700 rounded disabled:opacity-50 cursor-pointer"
        >
          {isSavingVisionMask ? "Saving..." : "Save Vision Mask"}
        </button>
      </div>
    </div>
  );
};

export default PubAreaVisionMask;
