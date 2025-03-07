import { useRef, useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A simple but effective solution that adds a large semi-transparent shadow-receiving
 * ground plane that follows the camera. This is a pragmatic approach when more
 * complex terrain-following solutions don't work.
 */
export default function ShadowGroundPlane() {
  const { scene, camera } = useThree();
  const planeRef = useRef<THREE.Mesh | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Create a large ground plane that will follow the camera
    const geometry = new THREE.PlaneGeometry(10000, 10000);

    // Create a material that is mostly transparent but will receive shadows
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1, // Very subtle, almost invisible
      side: THREE.DoubleSide,
      depthWrite: false, // Important to not affect depth testing
      roughness: 1.0,
      metalness: 0.0,
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.name = "shadow-ground-plane";
    plane.rotation.x = -Math.PI / 2; // Make it horizontal
    plane.receiveShadow = true;

    // Position initially below the camera
    updatePlanePosition(plane);

    scene.add(plane);
    planeRef.current = plane;
    setIsInitialized(true);

    console.log("Added shadow ground plane");

    return () => {
      if (planeRef.current) {
        scene.remove(planeRef.current);
        planeRef.current.geometry.dispose();
        (planeRef.current.material as THREE.Material).dispose();
        planeRef.current = null;
      }
    };
  }, [scene, camera]);

  // Function to position the plane below the camera
  const updatePlanePosition = (plane: THREE.Mesh) => {
    if (!camera) return;

    // Get camera position
    const cameraPos = camera.position.clone();

    // Cast a ray down from the camera
    const raycaster = new THREE.Raycaster(
      cameraPos,
      new THREE.Vector3(0, -1, 0)
    );

    // Find where the ray hits the plane
    const planeY = 0; // Default ground level

    // Position the plane below the camera at a fixed height
    plane.position.set(cameraPos.x, planeY, cameraPos.z);
  };

  // Update plane position when the camera moves
  useEffect(() => {
    if (!isInitialized || !planeRef.current) return;

    const handleCameraMove = () => {
      if (planeRef.current) {
        updatePlanePosition(planeRef.current);
      }
    };

    // Add event listener for camera movement
    window.addEventListener("wheel", handleCameraMove);
    window.addEventListener("mousedown", handleCameraMove);
    window.addEventListener("mouseup", handleCameraMove);

    // Also update periodically
    const interval = setInterval(handleCameraMove, 1000);

    return () => {
      window.removeEventListener("wheel", handleCameraMove);
      window.removeEventListener("mousedown", handleCameraMove);
      window.removeEventListener("mouseup", handleCameraMove);
      clearInterval(interval);
    };
  }, [isInitialized, camera]);

  return null;
}
