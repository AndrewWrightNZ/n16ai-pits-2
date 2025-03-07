import { useRef, useEffect, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A dynamic shadow system that analyzes the Google Maps tiles to find buildings
 * and creates custom shadow receivers that follow their shapes.
 */
export default function DynamicBuildingShadows({ tilesGroup }: any) {
  const { scene } = useThree();
  const shadowGroupRef = useRef(new THREE.Group());
  const processedIdsRef = useRef(new Set());
  const lastUpdateRef = useRef(0);

  // Create the shadow group
  useEffect(() => {
    const shadowGroup = new THREE.Group();
    shadowGroup.name = "building-shadow-receivers";
    scene.add(shadowGroup);
    shadowGroupRef.current = shadowGroup;

    console.log("Created building shadow receivers group");

    return () => {
      // Clean up on unmount
      scene.remove(shadowGroupRef.current);
    };
  }, [scene]);

  // Material for shadow receivers
  const createShadowMaterial = () => {
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 1.0,
      metalness: 0.0,
    });
  };

  // Create a shadow receiver for a building
  const createBuildingShadowReceiver = (building: any) => {
    try {
      if (!building.isMesh) return null;

      // Get building geometry details
      const bbox = new THREE.Box3().setFromObject(building);
      const size = new THREE.Vector3();
      bbox.getSize(size);

      // Skip tiny objects
      if (size.x < 5 || size.z < 5) return null;

      // Create a shadow receiver plane slightly larger than the building's footprint
      const bufferFactor = 1.3; // Add 30% buffer around the building
      const plane = new THREE.PlaneGeometry(
        size.x * bufferFactor,
        size.z * bufferFactor,
        1,
        1
      );

      const shadowMesh = new THREE.Mesh(plane, createShadowMaterial());
      shadowMesh.receiveShadow = true;
      shadowMesh.rotation.x = -Math.PI / 2; // Make it horizontal

      // Position at y=0 (ground level) but centered under the building's XZ position
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      shadowMesh.position.set(center.x, 0.2, center.z);

      // Store reference to the original building
      shadowMesh.userData.originalBuilding = building.uuid;

      return shadowMesh;
    } catch (error) {
      console.warn("Error creating building shadow:", error);
      return null;
    }
  };

  // Process a batch of buildings to add shadow receivers
  const processBuildings = (tilesGroup: any) => {
    if (!tilesGroup) return;

    console.log("Processing tiles group for building shadows");
    let newShadowsCount = 0;
    // @ts-ignore
    const buildingCandidates = [];

    // Step 1: Find potential buildings in the tiles
    tilesGroup.traverse((object: any) => {
      // Skip if already processed
      if (processedIdsRef.current.has(object.uuid)) return;

      // Look for mesh objects that might be buildings
      if (object.isMesh && object.visible) {
        const bbox = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        // Use height as a heuristic to identify buildings
        // Buildings are typically taller than terrain features
        if (size.y > 5 && size.x > 3 && size.z > 3) {
          buildingCandidates.push(object);
          processedIdsRef.current.add(object.uuid);
        }
      }
    });

    console.log(`Found ${buildingCandidates.length} potential buildings`);

    // Step 2: Create shadow receivers for buildings
    // Process in batches to avoid freezing the UI
    const batchSize = 20;
    // @ts-ignore
    const thisBatch = buildingCandidates.slice(0, batchSize);

    thisBatch.forEach((building) => {
      const shadowReceiver = createBuildingShadowReceiver(building);
      if (shadowReceiver) {
        shadowGroupRef.current.add(shadowReceiver);
        newShadowsCount++;
      }
    });

    console.log(
      `Added ${newShadowsCount} new shadow receivers. Total: ${shadowGroupRef.current.children.length}`
    );

    // Return remaining buildings for future processing
    // @ts-ignore
    return buildingCandidates.slice(batchSize);
  };

  // Process buildings when the tiles change
  useEffect(() => {
    if (tilesGroup) {
      const remainingBuildings = processBuildings(tilesGroup);

      // If there are more buildings to process, schedule them for later
      if (remainingBuildings && remainingBuildings.length > 0) {
        const processBatch = () => {
          const nextBatch = processBuildings(tilesGroup);
          if (nextBatch && nextBatch.length > 0) {
            setTimeout(processBatch, 200); // Process next batch after 200ms
          }
        };

        setTimeout(processBatch, 200);
      }
    }
  }, [tilesGroup]);

  // Periodically check for new buildings as tiles load
  useFrame((_, delta) => {
    lastUpdateRef.current += delta;

    // Check for new buildings every 2 seconds
    if (tilesGroup && lastUpdateRef.current > 2) {
      lastUpdateRef.current = 0;
      processBuildings(tilesGroup);
    }
  });

  return null;
}
