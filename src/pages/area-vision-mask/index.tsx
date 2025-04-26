import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import SimplePhotorealisticTilesMap from "../area-identifier/_shared/components/SimplePhotorealisticTilesMap";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const PubAreaVisionMask = () => {
  const navigate = useNavigate();
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);

  // Draw the mask polygon on the overlay canvas
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (points.length > 1) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#00ff00";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Draw points
    ctx.fillStyle = "#ff0000";
    for (const pt of points) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [points]);

  // Handle mouse click to add a point
  const handleOverlayClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints([...points, { x, y }]);
  };

  // Optionally, add a reset button to clear points
  const handleReset = () => setPoints([]);

  return (
    <div>
      <button
        onClick={() => navigate({ to: "/finder" })}
        className="flex items-center gap-2 mb-4"
      >
        <ChevronLeft className="w-6 h-6" />
        back to map
      </button>
      <p className="mb-2">Set up Pub Area Vision Mask</p>
      <div
        style={{
          position: "relative",
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          border: "2px solid #ccc",
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
          <SimplePhotorealisticTilesMap pageName="scene" />
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
      <button
        onClick={handleReset}
        className="mt-2 px-4 py-1 bg-gray-200 rounded"
      >
        Reset Mask
      </button>
      <div className="mt-2 text-sm text-gray-500">
        Click to add points. Area inside the polygon will be masked. Reset to
        start over.
      </div>
    </div>
  );
};

export default PubAreaVisionMask;
