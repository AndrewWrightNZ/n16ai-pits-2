import React from "react";
import * as THREE from "three";

interface MultiLayerGroundProps {
  baseColor?: string;
  groundSize?: number;
  basePosition?: [number, number, number];
  shadowOpacity?: number;
  baseOpacity?: number;
  enableGrid?: boolean;
  gridSize?: number;
  gridDivisions?: number;
  gridColor?: string;
  layerCount?: number; // Number of shadow-receiving planes
}

export default function MultiLayerGround({
  baseColor = "#ffffff",
  groundSize = 10000,
  basePosition = [0, 0, 0],
  shadowOpacity = 0.8,
  baseOpacity = 1.0,
  enableGrid = true,
  gridSize = 1000,
  gridDivisions = 20,
  gridColor = "#888888",
  layerCount = 5, // Multiple layers at different heights
}: MultiLayerGroundProps) {
  // Convert hex color to THREE.Color
  const groundColor = new THREE.Color(baseColor);

  // Create shadow planes at different heights
  const shadowPlanes = [];
  const maxHeight = 300; // Maximum height for shadow planes

  for (let i = 0; i < layerCount; i++) {
    // Distribute heights exponentially (more planes near the ground)
    const heightFactor = i / (layerCount - 1);
    const height = Math.pow(heightFactor, 2) * maxHeight;

    // Decrease opacity for higher planes
    const opacityFactor = 1 - (i / layerCount) * 0.5;

    shadowPlanes.push(
      <mesh
        key={`shadow-plane-${i}`}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[basePosition[0], basePosition[1] + height, basePosition[2]]}
      >
        <planeGeometry args={[groundSize, groundSize]} />
        <shadowMaterial
          transparent
          opacity={shadowOpacity * opacityFactor}
          color={0x000000}
        />
      </mesh>
    );
  }

  return (
    <group>
      {/* Base visible ground plane */}
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={basePosition}
      >
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial
          color={groundColor}
          roughness={0.9}
          metalness={0.0}
          transparent={baseOpacity < 1}
          opacity={baseOpacity}
        />
      </mesh>

      {/* Shadow-receiving planes at different heights */}
      {shadowPlanes}

      {/* Optional grid for reference */}
      {enableGrid && (
        <gridHelper
          args={[gridSize, gridDivisions, gridColor, gridColor]}
          position={[basePosition[0], basePosition[1] + 0.5, basePosition[2]]}
        />
      )}
    </group>
  );
}
