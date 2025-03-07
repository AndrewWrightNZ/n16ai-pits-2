import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A component that adds debug objects to test if shadows are working at all
 */
export default function SimpleShadowProvider() {
  const objectsRef = useRef<THREE.Group>(null);
  const { scene } = useThree();

  useEffect(() => {
    // Create a group to hold all our debug objects
    const debugGroup = new THREE.Group();
    debugGroup.name = "shadow-debug-objects";

    // 1. Create a floating cube that should cast shadows
    const cubeGeometry = new THREE.BoxGeometry(50, 50, 50);
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(0, 100, 0); // Position it 100 units above the origin
    cube.castShadow = true;
    debugGroup.add(cube);

    // 2. Create a floating sphere that should cast shadows
    const sphereGeometry = new THREE.SphereGeometry(30, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(100, 100, 100); // Position it away from the cube
    sphere.castShadow = true;
    debugGroup.add(sphere);

    // 3. Create a ground plane that should receive shadows
    const planeGeometry = new THREE.PlaneGeometry(500, 500);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Make it horizontal
    plane.position.set(0, -2, 0); // Slightly below the origin
    plane.receiveShadow = true;
    debugGroup.add(plane);

    // Add all debug objects to the scene
    scene.add(debugGroup);
    objectsRef.current = debugGroup;

    console.log("Added shadow debug test objects:", debugGroup);

    return () => {
      if (objectsRef.current) {
        scene.remove(objectsRef.current);
      }
    };
  }, [scene]);

  return null;
}
