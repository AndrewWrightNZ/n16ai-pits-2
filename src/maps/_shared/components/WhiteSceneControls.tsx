import React, { useState } from "react";

interface WhiteSceneControlsProps {
  onWhiteModeToggle: (enabled: boolean) => void;
  onShadowOpacityChange: (opacity: number) => void;
  onGroundColorChange: (color: string) => void;
  onBuildingBrightnessChange: (brightness: number) => void;
  initialWhiteMode?: boolean;
  initialShadowOpacity?: number;
}

export default function WhiteSceneControls({
  onWhiteModeToggle,
  onShadowOpacityChange,
  onGroundColorChange,
  onBuildingBrightnessChange,
  initialWhiteMode = true,
  initialShadowOpacity = 0.7,
}: WhiteSceneControlsProps) {
  const [whiteMode, setWhiteMode] = useState(initialWhiteMode);
  const [shadowOpacity, setShadowOpacity] = useState(initialShadowOpacity);
  const [groundColor, setGroundColor] = useState("#ffffff");
  const [buildingBrightness, setBuildingBrightness] = useState(1.0);

  const handleWhiteModeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setWhiteMode(newValue);
    onWhiteModeToggle(newValue);
  };

  const handleShadowOpacityChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = parseFloat(e.target.value);
    setShadowOpacity(newValue);
    onShadowOpacityChange(newValue);
  };

  const handleGroundColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setGroundColor(newValue);
    onGroundColorChange(newValue);
  };

  const handleBuildingBrightnessChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = parseFloat(e.target.value);
    setBuildingBrightness(newValue);
    onBuildingBrightnessChange(newValue);
  };

  return (
    <div
      className="white-scene-controls"
      style={{
        position: "absolute",
        bottom: 20,
        left: 20,
        padding: 15,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        borderRadius: 8,
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
        zIndex: 1000,
      }}
    >
      <h3 style={{ margin: "0 0 10px 0" }}>White Scene Controls</h3>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={whiteMode}
            onChange={handleWhiteModeToggle}
            style={{ marginRight: 8 }}
          />
          White Mode Enabled
        </label>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: "block", marginBottom: 5 }}>
          Shadow Opacity: {shadowOpacity.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={shadowOpacity}
          onChange={handleShadowOpacityChange}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: "block", marginBottom: 5 }}>
          Ground Color:
        </label>
        <input
          type="color"
          value={groundColor}
          onChange={handleGroundColorChange}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: "block", marginBottom: 5 }}>
          Building Brightness: {buildingBrightness.toFixed(2)}
        </label>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.01"
          value={buildingBrightness}
          onChange={handleBuildingBrightnessChange}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
