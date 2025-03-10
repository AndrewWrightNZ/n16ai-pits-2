import React from "react";
import { Html } from "@react-three/drei";

interface WhiteSceneControlsProps {
  whiteSceneEnabled: boolean;
  setWhiteSceneEnabled: (enabled: boolean) => void;
  buildingBrightness: number;
  setBuildingBrightness: (brightness: number) => void;
  groundHeight: number;
  setGroundHeight: (height: number) => void;
  shadowIntensity: number;
  setShadowIntensity: (intensity: number) => void;
  performanceMode: boolean;
  setPerformanceMode: (enabled: boolean) => void;
}

const WhiteSceneControls: React.FC<WhiteSceneControlsProps> = ({
  whiteSceneEnabled,
  setWhiteSceneEnabled,
  buildingBrightness,
  setBuildingBrightness,
  groundHeight,
  setGroundHeight,
  shadowIntensity,
  setShadowIntensity,
  performanceMode,
  setPerformanceMode,
}) => {
  return (
    <Html position={[0, 0, 0]} style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          background: "rgba(255, 255, 255, 0.8)",
          padding: "10px",
          borderRadius: "8px",
          width: "250px",
          pointerEvents: "auto",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <label
              htmlFor="performance-toggle"
              style={{
                fontWeight: "bold",
                color: performanceMode ? "#e74c3c" : "#333",
              }}
            >
              Performance Mode
            </label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                id="performance-toggle"
                checked={performanceMode}
                onChange={(e) => setPerformanceMode(e.target.checked)}
                style={{
                  height: 0,
                  width: 0,
                  visibility: "hidden",
                  position: "absolute",
                }}
              />
              <label
                htmlFor="performance-toggle"
                style={{
                  cursor: "pointer",
                  textIndent: "-9999px",
                  width: "50px",
                  height: "25px",
                  background: performanceMode ? "#e74c3c" : "#ccc",
                  display: "block",
                  borderRadius: "25px",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: performanceMode ? "28px" : "3px",
                    width: "19px",
                    height: "19px",
                    borderRadius: "19px",
                    transition: "0.3s",
                    background: "#fff",
                  }}
                />
              </label>
            </div>
          </div>
          {performanceMode && (
            <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
              Improves framerate but reduces visual quality
            </div>
          )}
        </div>

        <div style={{ marginBottom: "10px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <label htmlFor="white-scene-toggle" style={{ fontWeight: "bold" }}>
              White Scene
            </label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                id="white-scene-toggle"
                checked={whiteSceneEnabled}
                onChange={(e) => setWhiteSceneEnabled(e.target.checked)}
                style={{
                  height: 0,
                  width: 0,
                  visibility: "hidden",
                  position: "absolute",
                }}
              />
              <label
                htmlFor="white-scene-toggle"
                style={{
                  cursor: "pointer",
                  textIndent: "-9999px",
                  width: "50px",
                  height: "25px",
                  background: whiteSceneEnabled ? "#2ecc71" : "#ccc",
                  display: "block",
                  borderRadius: "25px",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: whiteSceneEnabled ? "28px" : "3px",
                    width: "19px",
                    height: "19px",
                    borderRadius: "19px",
                    transition: "0.3s",
                    background: "#fff",
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label
            htmlFor="brightness-slider"
            style={{
              display: "block",
              marginBottom: "4px",
              fontWeight: "bold",
            }}
          >
            Building Brightness: {buildingBrightness.toFixed(1)}
          </label>
          <input
            type="range"
            id="brightness-slider"
            min="0.5"
            max="1.5"
            step="0.1"
            value={buildingBrightness}
            onChange={(e) => setBuildingBrightness(parseFloat(e.target.value))}
            style={{ width: "100%" }}
            disabled={!whiteSceneEnabled}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label
            htmlFor="ground-height-slider"
            style={{
              display: "block",
              marginBottom: "4px",
              fontWeight: "bold",
            }}
          >
            Ground Height: {groundHeight}
          </label>
          <input
            type="range"
            id="ground-height-slider"
            min="0"
            max="200"
            step="5"
            value={groundHeight}
            onChange={(e) => setGroundHeight(parseInt(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label
            htmlFor="shadow-intensity-slider"
            style={{
              display: "block",
              marginBottom: "4px",
              fontWeight: "bold",
            }}
          >
            Shadow Intensity: {shadowIntensity.toFixed(1)}
          </label>
          <input
            type="range"
            id="shadow-intensity-slider"
            min="0"
            max="1"
            step="0.1"
            value={shadowIntensity}
            onChange={(e) => setShadowIntensity(parseFloat(e.target.value))}
            style={{ width: "100%" }}
            disabled={!whiteSceneEnabled}
          />
        </div>
      </div>
    </Html>
  );
};

export default WhiteSceneControls;
