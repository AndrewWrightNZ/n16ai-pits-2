import { useRef, useEffect, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TerrainShadowReceiverProps {
  tilesGroup: THREE.Group;
  updateInterval?: number;
}

/**
 * This component creates a single, unified shadow receiver that conforms
 * to the overall terrain/tiles geometry rather than creating individual
 * shadow receivers for each tile.
 */
export default function TerrainShadowReceiver({
  tilesGroup,
  updateInterval = 2000, // Update every 2 seconds by default
}: TerrainShadowReceiverProps) {
  const { scene } = useThree();
  const shadowMeshRef = useRef<THREE.Mesh | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Create and update the shadow receiver
  useEffect(() => {
    if (!tilesGroup) return;

    console.log("Creating terrain shadow receiver..., ", tilesGroup);

    // Create shadow mesh if it doesn't exist
    if (!shadowMeshRef.current) {
      // Create a simple plane as the base mesh
      const geometry = new THREE.PlaneGeometry(10000, 10000, 100, 100);
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 1.0,
        metalness: 0.0,
        transparent: true,
        opacity: 0.8, // For debugging
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = "terrain-shadow-receiver";
      mesh.rotation.x = -Math.PI / 2; // Make it horizontal
      mesh.receiveShadow = true;

      // Add to scene
      scene.add(mesh);
      shadowMeshRef.current = mesh;

      console.log("Created terrain shadow receiver: ", mesh);
    }

    return () => {
      // Clean up on unmount
      if (shadowMeshRef.current) {
        scene.remove(shadowMeshRef.current);
        shadowMeshRef.current.geometry.dispose();
        (shadowMeshRef.current.material as THREE.Material).dispose();
        shadowMeshRef.current = null;
      }
    };
  }, [scene, tilesGroup]);

  // Compute the ground height at a specific XZ coordinate
  const getGroundHeightAt = (x: number, z: number): number => {
    if (!tilesGroup) return 0;

    // Start with a ray from high above
    const rayStart = new THREE.Vector3(x, 1000, z);
    const rayDir = new THREE.Vector3(0, -1, 0);
    const raycaster = new THREE.Raycaster(rayStart, rayDir);

    // Get all intersections with the tiles
    const intersects = raycaster.intersectObject(tilesGroup, true);

    // Find the highest intersection point
    if (intersects.length > 0) {
      // Sort by distance (closest first)
      intersects.sort((a, b) => a.distance - b.distance);
      // Return the y coordinate of the first intersection
      return rayStart.y - intersects[0].distance;
    }

    // Default ground level if no intersection
    return 0;
  };

  // Update the shadow receiver mesh to follow terrain
  const updateShadowMesh = () => {
    if (!shadowMeshRef.current || !tilesGroup || !tilesGroup.children.length)
      return;

    console.log("Updating shadow mesh to match terrain...");

    const geometry = shadowMeshRef.current.geometry as THREE.PlaneGeometry;
    const position = geometry.attributes.position;

    // Get bounds of the tiles for proper positioning
    const box = new THREE.Box3().setFromObject(tilesGroup);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    // Position and scale the shadow plane to cover the tiles
    shadowMeshRef.current.position.set(center.x, 0, center.z);

    // Ensure we have at least 20% buffer around the tiles
    const bufferFactor = 1.2;
    const width = Math.max(10000, size.x * bufferFactor);
    const height = Math.max(10000, size.z * bufferFactor);

    // Update the plane geometry to match the tiles
    shadowMeshRef.current.scale.set(
      width / 10000, // Original plane is 10000x10000
      height / 10000,
      1
    );

    // Only sample terrain heights for a subset of vertices to improve performance
    // Adjust this based on your performance requirements
    const sampleEvery = 10; // Sample every 10th vertex

    // Update vertex heights based on the terrain
    for (let i = 0; i < position.count; i += sampleEvery) {
      const x = position.getX(i);
      const z = position.getZ(i);

      // Convert local coordinates to world coordinates
      const worldX = x * shadowMeshRef.current.scale.x + center.x;
      const worldZ = z * shadowMeshRef.current.scale.y + center.z;

      // Get terrain height at this position
      const terrainHeight = getGroundHeightAt(worldX, worldZ);

      // Update vertex Y position to match terrain with a small offset
      const yOffset = 0.5; // Small offset above terrain
      position.setY(i, terrainHeight + yOffset - center.y);

      // Update surrounding vertices too for smoother transitions
      // This creates a smoother approximation without sampling every vertex
      for (let j = 1; j < sampleEvery && i + j < position.count; j++) {
        position.setY(i + j, terrainHeight + yOffset - center.y);
      }

      console.log("Sampled terrain height at", worldX, worldZ, terrainHeight);
    }

    // Mark the geometry for update
    position.needsUpdate = true;
    geometry.computeVertexNormals();

    console.log("Shadow mesh updated to match terrain");
    setIsInitialized(true);
  };

  // Update the shadow receiver periodically or when tiles change
  useFrame((_, delta) => {
    lastUpdateRef.current += delta * 1000; // Convert to milliseconds

    // Check if it's time for an update
    if (
      !isInitialized ||
      (tilesGroup?.children.length && lastUpdateRef.current > updateInterval)
    ) {
      updateShadowMesh();
      lastUpdateRef.current = 0;
    }
  });

  return null; // This component doesn't render anything directly
}
