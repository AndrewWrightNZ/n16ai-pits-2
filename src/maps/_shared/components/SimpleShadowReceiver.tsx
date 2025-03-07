import { useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A very simple shadow receiver that creates a visible plane at a fixed height
 * for debugging purposes.
 */
export default function SimpleShadowReceiver() {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const { scene } = useThree();

  useEffect(() => {
    // Create a simple visible plane at y=0 with a bright color for debugging
    const geometry = new THREE.PlaneGeometry(10000, 10000);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff00ff, // Bright magenta for visibility
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.5, // Semi-transparent for debugging
      side: THREE.DoubleSide,
      // Keep depthWrite true for debugging so it's definitely visible
      depthWrite: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "debug-shadow-receiver";
    mesh.rotation.x = -Math.PI / 2; // Make it horizontal (XZ plane)
    mesh.position.set(0, 0, 0); // Position at y=0
    mesh.receiveShadow = true;

    scene.add(mesh);
    meshRef.current = mesh;

    console.log("Created DEBUG shadow receiver at y=0", mesh);

    return () => {
      if (meshRef.current) {
        scene.remove(meshRef.current);
        meshRef.current.geometry.dispose();
        // @ts-ignore
        meshRef.current.material.dispose();
      }
    };
  }, [scene]);

  return null;
}
