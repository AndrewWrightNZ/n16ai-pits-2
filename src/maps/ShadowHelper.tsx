import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CameraHelper } from "three";

interface ShadowHelperProps {
  directionalLightRef: React.RefObject<THREE.DirectionalLight>;
  visible?: boolean;
}

/**
 * Helper component to visualize shadow cameras for debugging
 */
const ShadowHelper: React.FC<ShadowHelperProps> = ({
  directionalLightRef,
  visible = true,
}) => {
  const shadowCameraHelperRef = useRef<CameraHelper | null>(null);

  useFrame(() => {
    if (!directionalLightRef.current || !visible) return;

    // Create or update the camera helper
    if (
      directionalLightRef.current.shadow &&
      directionalLightRef.current.shadow.camera &&
      !shadowCameraHelperRef.current
    ) {
      shadowCameraHelperRef.current = new CameraHelper(
        directionalLightRef.current.shadow.camera
      );

      if (directionalLightRef.current.parent) {
        directionalLightRef.current.parent.add(shadowCameraHelperRef.current);
      }
    }

    // Update the helper if it exists
    if (shadowCameraHelperRef.current) {
      shadowCameraHelperRef.current.update();

      // Update visibility
      shadowCameraHelperRef.current.visible = visible;
    }
  });

  return null; // This is a utility component with no visual output
};

/**
 * Ground plane component for better shadow visualization
 */
export const GroundPlane: React.FC<{ size?: number; height?: number }> = ({
  size = 10000,
  height = -10,
}) => {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, height, 0]}
      receiveShadow
    >
      <planeGeometry args={[size, size]} />
      <shadowMaterial transparent opacity={0.4} />
    </mesh>
  );
};

export default ShadowHelper;
