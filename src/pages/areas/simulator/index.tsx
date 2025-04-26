import { useRef, useEffect } from "react";

// Components
import SimplePhotorealisticTilesMap from "../identifier/_shared/components/SimplePhotorealisticTilesMap";

// Hooks
import usePubAreas from "../identifier/_shared/hooks/usePubAreas";

// Constants
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

const PubAreaSimulator = () => {
  //

  // Hooks

  const {
    data: { selectedPub, selectedPubArea },
  } = usePubAreas();

  console.log({ selectedPub, selectedPubArea });

  // Refs
  const overlayRef = useRef<HTMLCanvasElement>(null);

  //

  // Variables
  const visionMaskPoints = selectedPubArea?.vision_mask_points || [];

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
    <div className="w-full h-[100vh] bg-black text-white p-4 rounded">
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
    </div>
  );
};

export default PubAreaSimulator;
