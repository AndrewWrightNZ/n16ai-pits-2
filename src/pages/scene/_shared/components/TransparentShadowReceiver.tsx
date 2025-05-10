// TransparentShadowReceiver component
// Adds a transparent material overlay on top of photorealistic tiles that can receive shadows
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface TransparentShadowReceiverProps {
  tilesGroup: THREE.Group;
  shadowOpacity: number;
  enabled?: boolean;
  shadowIntensity?: number;
}

export default function TransparentShadowReceiver({
  tilesGroup,
  shadowOpacity,
  enabled = true,
  shadowIntensity = 0.8,
}: TransparentShadowReceiverProps) {
  const shadowOverlayMaterials = useRef<Map<string, THREE.Material>>(new Map());
  const processedObjects = useRef<Set<string>>(new Set());
  const [isActive, setIsActive] = useState(enabled);

  console.log("TransparentShadowReceiver props:", {
    enabled,
    shadowOpacity,
    shadowIntensity,
    hasGroup: !!tilesGroup,
  });

  // Toggle shadow receiver mode
  useEffect(() => {
    setIsActive(enabled);

    if (!tilesGroup) return;

    if (!enabled) {
      // Remove shadow overlay meshes
      removeShadowOverlays(tilesGroup);
    } else if (enabled) {
      // Apply shadow overlays
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

  // Create shadow-receiving overlay
  const createShadowOverlay = (mesh: THREE.Mesh) => {
    // Skip if the mesh doesn't have geometry
    if (!mesh.geometry) return;

    console.log("Creating shadow overlay for mesh:", mesh.uuid);

    try {
      // Use a semi-transparent white material that can receive shadows
      // This will allow us to see both the underlying material and the shadows
      const whiteMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        opacity: 0.2, // Low opacity to see the underlying material
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.1,
        depthWrite: false, // Prevent z-fighting
      });

      // Clone the mesh geometry
      const clonedGeometry = mesh.geometry.clone();

      // Ensure proper vertex normals
      clonedGeometry.computeVertexNormals();

      // Create a new mesh with the semi-transparent white material
      const overlayMesh = new THREE.Mesh(clonedGeometry, whiteMaterial);

      // Copy the transformation from the original mesh
      overlayMesh.position.copy(mesh.position);
      overlayMesh.rotation.copy(mesh.rotation);
      overlayMesh.scale.copy(mesh.scale);
      overlayMesh.matrix.copy(mesh.matrix);
      overlayMesh.matrixWorld.copy(mesh.matrixWorld);

      // Enable shadow receiving on the overlay
      overlayMesh.receiveShadow = true;
      overlayMesh.castShadow = false;

      // Mark as our shadow overlay
      overlayMesh.userData.isShadowOverlay = true;

      // Position it very slightly above the original to avoid z-fighting
      // Use a minimal offset to keep it as close as possible to the original surface
      overlayMesh.position.y += 0.001; // Minimal offset

      // Add it as a sibling to the original mesh
      if (mesh.parent) {
        mesh.parent.add(overlayMesh);
      }

      // Store reference to the white material
      shadowOverlayMaterials.current.set(overlayMesh.uuid, whiteMaterial);
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

    console.log("Processing object for shadow overlay:", object.uuid);

    processedObjects.current.add(object.uuid);

    if (object instanceof THREE.Mesh && object.material) {
      // For all meshes, create a shadow overlay
      // This ensures shadows can be cast onto any surface
      createShadowOverlay(object);

      // Ensure original mesh can cast shadows
      object.castShadow = true;
    }

    // Process all children
    if (object.children && object.children.length > 0) {
      object.children.forEach((child) => processObject(child));
    }
  };

  // Monitor for new tiles and apply shadow overlays
  useEffect(() => {
    if (!tilesGroup || !isActive) return;

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
        removeShadowOverlays(tilesGroup);
      }
    };
  }, [tilesGroup, isActive]);

  // Update overlay material opacity when shadowOpacity changes
  useEffect(() => {
    shadowOverlayMaterials.current.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        // Adjust opacity based on shadow settings
        material.opacity = Math.min(0.3, shadowIntensity * 0.3); // Cap at 0.3 to keep it subtle
        material.needsUpdate = true;
        console.log(
          "Updated white overlay material opacity to:",
          material.opacity
        );
      }
    });
  }, [shadowOpacity, shadowIntensity]);

  return null; // This is a non-visual component
}
