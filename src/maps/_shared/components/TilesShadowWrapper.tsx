import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

interface TilesShadowWrapperProps {
  tilesGroup: THREE.Group | null;
  shadowOpacity?: number;
}

/**
 * Component that enables shadows for Google 3D Tiles
 * This version preserves original materials while allowing shadow visualization
 */
export default function TilesShadowWrapper({
  tilesGroup,
  shadowOpacity = 0.3,
}: TilesShadowWrapperProps) {
  const { scene } = useThree();
  const shadowGroupRef = useRef<THREE.Group | null>(null);
  const processingTimeoutRef = useRef<number | null>(null);
  const processedMeshesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Clean up any existing shadow group
    if (shadowGroupRef.current) {
      scene.remove(shadowGroupRef.current);
      shadowGroupRef.current = null;
    }

    // Reset processed meshes on tilesGroup change
    processedMeshesRef.current.clear();

    if (!tilesGroup) return;

    // Create a new group for shadow receivers
    const shadowGroup = new THREE.Group();
    shadowGroup.name = "tiles-shadow-receivers";
    scene.add(shadowGroup);
    shadowGroupRef.current = shadowGroup;

    // Create a single large shadow-receiving plane
    const createShadowPlane = () => {
      const planeGeometry = new THREE.PlaneGeometry(10000, 10000);
      const shadowMaterial = new THREE.ShadowMaterial({
        color: 0x000000,
        opacity: shadowOpacity,
        transparent: true,
        side: THREE.DoubleSide,
      });

      const plane = new THREE.Mesh(planeGeometry, shadowMaterial);
      plane.rotation.x = -Math.PI / 2; // Horizontal plane
      plane.position.y = -5; // Changed from -0.5 to -5 to lower the shadow plane
      plane.receiveShadow = true;
      plane.name = "main-shadow-plane";

      return plane;
    };

    // Add the shadow plane to our shadow group
    const shadowPlane = createShadowPlane();
    shadowGroup.add(shadowPlane);

    // Add elevated shadow planes
    const addElevatedPlanes = () => {
      const heights = [15, 45, 95, 195];
      const sizes = [500, 400, 300, 200];

      heights.forEach((height, index) => {
        const planeSize = sizes[index];
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(planeSize, planeSize),
          new THREE.ShadowMaterial({
            color: 0x000000,
            opacity: shadowOpacity * 0.8,
            transparent: true,
            side: THREE.DoubleSide,
          })
        );

        plane.rotation.x = -Math.PI / 2;
        plane.position.y = height;
        plane.receiveShadow = true;
        plane.name = `elevated-shadow-plane-${height}`;

        shadowGroup.add(plane);
      });
    };

    addElevatedPlanes();

    // This function only enables shadow casting on meshes but preserves original materials
    const enableShadowCasting = () => {
      if (!tilesGroup) return;

      try {
        tilesGroup.traverse((object) => {
          // Skip objects we've already processed
          if (object.uuid && processedMeshesRef.current.has(object.uuid)) {
            return;
          }

          if (object instanceof THREE.Mesh) {
            // Mark as processed
            processedMeshesRef.current.add(object.uuid);

            // IMPORTANT: Only enable shadow casting, don't modify materials
            object.castShadow = true;

            // Do NOT make original tiles receive shadows
            object.receiveShadow = false;

            // For materials that don't respond to shadows, just ensure they're visible
            // but don't convert them
            if (object.material) {
              const materials = Array.isArray(object.material)
                ? object.material
                : [object.material];

              materials.forEach((material) => {
                // Ensure visibility - but don't change the material type
                if (material) {
                  // If it's a MeshBasicMaterial, just ensure it's visible
                  if (material instanceof THREE.MeshBasicMaterial) {
                    // Only ensure it has proper transparency settings if needed
                    if (material.transparent) {
                      material.needsUpdate = true;
                    }
                  }
                }
              });
            }
          }
        });

        // Schedule another check for new objects less frequently
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
        }

        processingTimeoutRef.current = setTimeout(enableShadowCasting, 10000);
      } catch (error) {
        console.error("Error in shadow processing:", error);
      }
    };

    // Start processing with a small delay
    processingTimeoutRef.current = setTimeout(enableShadowCasting, 500);

    return () => {
      // Clean up on unmount
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }

      if (shadowGroupRef.current) {
        scene.remove(shadowGroupRef.current);
        shadowGroupRef.current = null;
      }

      processedMeshesRef.current.clear();
    };
  }, [tilesGroup, scene, shadowOpacity]);

  return null;
}
