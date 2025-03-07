import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

interface TilesShadowWrapperProps {
  tilesGroup: THREE.Group | null;
  shadowOpacity?: number;
}

/**
 * Component that enables shadows for Google 3D Tiles
 * Streamlined version that prevents duplicate processing
 */
export default function TilesShadowWrapper({
  tilesGroup,
  shadowOpacity = 0.3,
}: TilesShadowWrapperProps) {
  const { scene } = useThree();
  const shadowGroupRef = useRef<THREE.Group | null>(null);
  const processingTimeoutRef = useRef<number | null>(null);

  // Track which meshes we've already processed to avoid duplicates
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
      plane.position.y = -0.5; // Slightly below ground level
      plane.receiveShadow = true;
      plane.name = "main-shadow-plane";

      return plane;
    };

    // Add the shadow plane to our shadow group
    const shadowPlane = createShadowPlane();
    shadowGroup.add(shadowPlane);

    // Add smaller shadow-receiving planes at different heights to catch
    // shadows from elevated objects
    const addElevatedPlanes = () => {
      const heights = [20, 50, 100, 200];
      const sizes = [500, 400, 300, 200];

      heights.forEach((height, index) => {
        const planeSize = sizes[index];
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(planeSize, planeSize),
          new THREE.ShadowMaterial({
            color: 0x000000,
            opacity: shadowOpacity * 0.8, // Slightly more transparent
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

    // Add elevated planes only if we have a shadow group
    addElevatedPlanes();

    // This function only enables shadow casting on meshes
    // but does NOT modify materials (leaving that to TilesScene)
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

            // Make the mesh cast shadows but not receive them
            object.castShadow = true;
            object.receiveShadow = false; // The plane will receive shadows
          }
        });

        // Schedule check for new objects
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
        }

        // Reduce frequency of checks to improve performance
        processingTimeoutRef.current = setTimeout(enableShadowCasting, 10000);
      } catch (error) {
        console.error("Error in shadow processing:", error);
      }
    };

    // Start processing after a short delay
    processingTimeoutRef.current = setTimeout(enableShadowCasting, 500);

    return () => {
      // Clean up
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
