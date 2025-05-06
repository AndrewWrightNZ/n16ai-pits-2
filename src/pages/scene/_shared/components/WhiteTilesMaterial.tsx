// Enhanced WhiteTilesMaterial with improved geometry preservation
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface WhiteTilesMaterialProps {
  tilesGroup: THREE.Group;
  shadowOpacity: number;
  enabled?: boolean;
  brightness?: number;
  roughness?: number;
  // New props for shadow enhancement
  shadowIntensity?: number;
}

export default function WhiteTilesMaterial({
  tilesGroup,
  shadowOpacity,
  enabled = true,
  brightness = 1.0,
  roughness = 0.8,
  shadowIntensity = 0.8,
}: WhiteTilesMaterialProps) {
  const originalMaterials = useRef<
    Map<string, THREE.Material | THREE.Material[]>
  >(new Map());
  const whiteMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const shadowOverlayMaterials = useRef<Map<string, THREE.Material>>(new Map());
  const processedObjects = useRef<Set<string>>(new Set());
  const [isActive, setIsActive] = useState(enabled);

  // Create the white material with configurable properties
  useEffect(() => {
    if (!whiteMaterialRef.current) {
      // Create primary white material with improved properties
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: roughness,
        metalness: 0.2, // Reduced metalness for more natural look
        flatShading: false,
        side: THREE.DoubleSide,
        envMapIntensity: 0.5, // Add subtle environment map influence
        dithering: true, // Enable dithering for smoother gradients
      });

      // Enhanced shadow properties
      material.shadowSide = THREE.DoubleSide;

      whiteMaterialRef.current = material;
    } else {
      // Update existing material properties
      whiteMaterialRef.current.roughness = roughness;
      whiteMaterialRef.current.metalness = 0.2;

      // Adjust brightness through emissive and color
      const brightness_adjusted = Math.max(0, brightness - 1.0);
      if (brightness_adjusted > 0) {
        whiteMaterialRef.current.emissive.set(
          brightness_adjusted,
          brightness_adjusted,
          brightness_adjusted
        );
      } else {
        whiteMaterialRef.current.emissive.set(0, 0, 0);
        // For dimming below 1.0, adjust the color directly with gamma correction
        const color_value = Math.min(1.0, Math.max(0.5, brightness));
        whiteMaterialRef.current.color.set(
          new THREE.Color(
            `rgb(${color_value * 255}, ${color_value * 255}, ${color_value * 255})`
          )
        );
      }
    }
  }, [roughness, brightness]);

  // Toggle white material mode
  useEffect(() => {
    setIsActive(enabled);

    if (!tilesGroup) return;

    if (!enabled) {
      // Restore original materials
      restoreOriginalMaterials();
      // Remove shadow overlay meshes
      removeShadowOverlays(tilesGroup);
    } else if (enabled && whiteMaterialRef.current) {
      // Apply white materials
      processedObjects.current.clear();
      processObject(tilesGroup);
    }
  }, [enabled, tilesGroup]);

  // Remove shadow overlay meshes
  const removeShadowOverlays = (rootObject: THREE.Object3D) => {
    // Find and remove all shadow overlay meshes we added
    rootObject.traverse((object) => {
      if (object.userData && object.userData.isShadowOverlay) {
        if (object.parent) {
          object.parent.remove(object);
        }
      }
    });
  };

  // Function to restore original materials
  const restoreOriginalMaterials = () => {
    originalMaterials.current.forEach((material, uuid) => {
      const object = findObjectByUuid(tilesGroup, uuid);
      if (object && object instanceof THREE.Mesh) {
        object.material = material;
      }
    });
  };

  // Helper to find an object by UUID in a scene graph
  const findObjectByUuid = (
    root: THREE.Object3D,
    uuid: string
  ): THREE.Object3D | null => {
    if (root.uuid === uuid) return root;

    for (const child of root.children) {
      const result = findObjectByUuid(child, uuid);
      if (result) return result;
    }

    return null;
  };

  // Create shadow-receiving overlay for horizontal surfaces
  const createShadowOverlay = (mesh: THREE.Mesh) => {
    // Skip if the mesh is tiny or not suitable for an overlay
    if (!mesh.geometry) return;

    try {
      // Create a shadow-only material with improved properties
      const shadowMaterial = new THREE.ShadowMaterial({
        color: 0x000000,
        opacity: shadowIntensity,
        transparent: true,
        side: THREE.DoubleSide,
      });

      // Clone the mesh geometry with improved precision
      const clonedGeometry = mesh.geometry.clone();

      // Ensure proper vertex normals
      clonedGeometry.computeVertexNormals();

      // Create a new mesh with shadow material
      const shadowMesh = new THREE.Mesh(clonedGeometry, shadowMaterial);
      shadowMesh.position.copy(mesh.position);
      shadowMesh.rotation.copy(mesh.rotation);
      shadowMesh.scale.copy(mesh.scale);
      shadowMesh.receiveShadow = true;
      shadowMesh.castShadow = false; // Shadow overlays shouldn't cast shadows
      shadowMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        side: THREE.DoubleSide,
      });

      // Mark as our shadow overlay
      shadowMesh.userData.isShadowOverlay = true;

      // Position it very slightly above the original to avoid z-fighting
      shadowMesh.position.y += 0.01; // Reduced offset for better precision

      // Add it as a sibling
      if (mesh.parent) {
        mesh.parent.add(shadowMesh);
      }

      // Store reference to the shadow material
      shadowOverlayMaterials.current.set(shadowMesh.uuid, shadowMaterial);
    } catch (error) {
      console.log(
        `Error creating shadow overlay for mesh ${mesh.uuid}: ${error}`
      );
    }
  };

  // Function to process an object and all its children recursively
  const processObject = (object: THREE.Object3D) => {
    // Skip if already processed
    if (processedObjects.current.has(object.uuid)) {
      return;
    }

    processedObjects.current.add(object.uuid);

    if (object instanceof THREE.Mesh && object.material) {
      // Store original material if not already stored
      if (!originalMaterials.current.has(object.uuid)) {
        originalMaterials.current.set(object.uuid, object.material);
      }

      // Replace with white material
      if (whiteMaterialRef.current && isActive) {
        object.material = whiteMaterialRef.current;
        // Ensure original mesh casts and receives shadows
        object.castShadow = true;
        object.receiveShadow = true;
      }

      // Ensure shadows are enabled with improved settings
      object.castShadow = true;
      object.receiveShadow = true;

      // For meshes that are approximately horizontal (like roofs, ground surfaces),
      // create a shadow overlay to better show shadows
      if (object.geometry) {
        // Get the normal vectors
        object.geometry.computeVertexNormals();

        // Try to access normal data from BufferGeometry
        if (object.geometry.attributes && object.geometry.attributes.normal) {
          const normalAttr = object.geometry.attributes.normal;
          let upFacingCount = 0;
          let totalCount = 0;

          // Sample normals to estimate orientation with improved precision
          for (let i = 0; i < normalAttr.count; i += 3) {
            // More frequent sampling
            const ny = normalAttr.getY(i);

            // If the normal faces up significantly
            if (ny > 0.8) {
              // Increased threshold for better accuracy
              upFacingCount++;
            }
            totalCount++;
          }

          // If more than 40% normals face up, consider it a horizontal surface
          if (totalCount > 0 && upFacingCount / totalCount > 0.4) {
            createShadowOverlay(object);
          }
        }
      }
    }

    // Process all children
    if (object.children && object.children.length > 0) {
      object.children.forEach((child) => processObject(child));
    }
  };

  // Monitor for new tiles and apply the white material
  useEffect(() => {
    if (!tilesGroup || !whiteMaterialRef.current || !isActive) return;

    // Initial processing
    processObject(tilesGroup);

    // Set up a recurring check for new objects
    const checkIntervalId = setInterval(() => {
      const findAndProcessNewObjects = (object: THREE.Object3D) => {
        if (!processedObjects.current.has(object.uuid)) {
          processObject(object);
        }

        // Check children
        if (object.children && object.children.length > 0) {
          object.children.forEach((child) => findAndProcessNewObjects(child));
        }
      };

      findAndProcessNewObjects(tilesGroup);
    }, 5000);

    // Cleanup
    return () => {
      clearInterval(checkIntervalId);

      if (!enabled) {
        restoreOriginalMaterials();
        removeShadowOverlays(tilesGroup);
      }
    };
  }, [tilesGroup, isActive]);

  // Update shadow overlay opacity when shadowOpacity changes
  useEffect(() => {
    shadowOverlayMaterials.current.forEach((material) => {
      if (material instanceof THREE.ShadowMaterial) {
        material.opacity = shadowIntensity * (shadowOpacity / 0.6);
        material.needsUpdate = true;
      }
    });
  }, [shadowOpacity, shadowIntensity]);

  return null; // This is a non-visual component
}
