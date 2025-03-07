import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/**
 * A simple component that adds test objects to visualize shadows
 */
export default function ImmediateShadowTest() {
  const sphereRef = useRef<THREE.Mesh>(null);
  const cubeRef = useRef<THREE.Mesh>(null);

  // Animate the test objects
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    if (sphereRef.current) {
      // Float the sphere up and down
      sphereRef.current.position.y = 50 + Math.sin(time * 0.5) * 20;
      sphereRef.current.position.x = Math.sin(time * 0.3) * 50;
      sphereRef.current.position.z = Math.cos(time * 0.3) * 50;
    }

    if (cubeRef.current) {
      // Rotate the cube
      cubeRef.current.rotation.y = time * 0.5;
      cubeRef.current.rotation.x = time * 0.2;
    }
  });

  return (
    <group>
      {/* Floating sphere to cast shadows */}
      <mesh ref={sphereRef} position={[0, 50, 0]} castShadow>
        <sphereGeometry args={[15, 32, 32]} />
        <meshStandardMaterial color="hotpink" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Rotating cube to cast shadows */}
      <mesh ref={cubeRef} position={[40, 20, 40]} castShadow>
        <boxGeometry args={[30, 30, 30]} />
        <meshStandardMaterial
          color="royalblue"
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>

      {/* Pole for testing vertical shadows */}
      <mesh position={[-50, 25, -50]} castShadow>
        <cylinderGeometry args={[5, 5, 50, 16]} />
        <meshStandardMaterial color="forestgreen" roughness={0.6} />
      </mesh>
    </group>
  );
}
