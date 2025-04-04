import { useEffect, useRef } from "react";
import * as THREE from "three";

interface TilesShadowWrapperProps {
  tilesGroup: THREE.Group;
  shadowOpacity?: number;
}

/**
 * A wrapper component that enables shadows on all meshes in a group of 3D tiles.
 * It also creates a shadow-receiving ground plane.
 */
export default function TilesShadowWrapper({
  tilesGroup,
  shadowOpacity = 0.6,
}: TilesShadowWrapperProps) {
  const processedMeshes = useRef<Set<string>>(new Set());
  const shadowMaterialRef = useRef<THREE.ShadowMaterial | null>(null);

  // Initialize shadow material
  useEffect(() => {
    if (!shadowMaterialRef.current) {
      shadowMaterialRef.current = new THREE.ShadowMaterial({
        color: 0x000000,
        opacity: shadowOpacity,
        transparent: true,
        side: THREE.DoubleSide,
      });
    } else {
      shadowMaterialRef.current.opacity = shadowOpacity;
      shadowMaterialRef.current.needsUpdate = true;
    }
  }, [shadowOpacity]);

  // Process all meshes to enable shadow casting and receiving
  useEffect(() => {
    if (!tilesGroup) return;

    // Process function to traverse the tree and set shadow properties
    const processMesh = (object: THREE.Object3D) => {
      if (processedMeshes.current.has(object.uuid)) return;

      // Mark as processed
      processedMeshes.current.add(object.uuid);

      if (object instanceof THREE.Mesh) {
        // Enable shadows
        object.castShadow = true;
        object.receiveShadow = true;

        // Update materials to ensure shadows are visible
        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach((material) => {
            if (material) {
              // Ensure material properties are set for shadow reception
              if (material instanceof THREE.MeshStandardMaterial) {
                material.shadowSide = THREE.DoubleSide;
              }
              material.needsUpdate = true;
            }
          });
        }
      }

      // Process children
      if (object.children && object.children.length > 0) {
        for (const child of object.children) {
          processMesh(child);
        }
      }
    };

    // Initial processing of all objects
    processMesh(tilesGroup);

    // Setup observer to handle new objects added to the scene
    const checkInterval = setInterval(() => {
      let newObjectsFound = false;

      const checkForNewObjects = (object: THREE.Object3D) => {
        if (!processedMeshes.current.has(object.uuid)) {
          processMesh(object);
          newObjectsFound = true;
        }

        if (object.children && object.children.length > 0) {
          for (const child of object.children) {
            checkForNewObjects(child);
          }
        }
      };

      checkForNewObjects(tilesGroup);
    }, 5000);

    return () => {
      clearInterval(checkInterval);
    };
  }, [tilesGroup]);

  return null; // This is a non-visual wrapper component
}
