import { useRef, useEffect, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { TilesRenderer } from "3d-tiles-renderer";
import {
  GLTFExtensionsPlugin,
  TileCompressionPlugin,
  TilesFadePlugin,
} from "3d-tiles-renderer/plugins";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

import * as sun from "../../../utils/sun";
import { PRESET_LOCATIONS } from "../hooks/locationsData";

// Interface for TilesScene props
interface TilesSceneProps {
  currentLocation: string;
  isOrbiting: boolean;
  timeOfDay: Date;
  setTileCount: (count: number) => void;
  setCopyrightInfo: (info: string) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLoadingProgress: (progress: number) => void;
  setLightRef: (ref: React.RefObject<THREE.DirectionalLight>) => void;
  showShadowHelper?: boolean;
}

interface TilesRendererExtendedEventMap {
  "load-error": { error: Error };
  "load-tile-set": { tileSet: object; url: string };
}

// Interface for OrbitControls reference
interface OrbitControlsRef {
  autoRotate: boolean;
  autoRotateSpeed: number;
  target: THREE.Vector3;
  minDistance: number;
  maxDistance: number;
  update: () => void;
}

// Extended interface for TilesRenderer to handle missing TypeScript definitions
interface ExtendedTilesRenderer extends TilesRenderer {
  stats?: {
    visible: number;
    active: number;
    loading: number;
    pending: number;
    inCacheSinceLoad: number;
    inCache: number;
    parsing: number;
    downloading: number;
    failed: number;
    inFrustum: number;
    used: number;
  };
  loadProgress: number;
  setLatLonToYUp(lat: number, lon: number): void;
  getAttributions(attributions: any[]): { type: string; value: any }[];
  addEventListener<K extends keyof TilesRendererExtendedEventMap>(
    type: K,
    listener: (event: TilesRendererExtendedEventMap[K]) => void
  ): void;
  onLoadModel: (model: any) => any;
}

// API key from environment variables
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Main TilesScene component that handles the 3D content
const TilesScene = ({
  currentLocation,
  isOrbiting,
  timeOfDay,
  setTileCount,
  setCopyrightInfo,
  setIsLoading,
  setError,
  setLoadingProgress,
  setLightRef,
  showShadowHelper = false,
}: TilesSceneProps) => {
  const tilesRendererRef = useRef<ExtendedTilesRenderer | null>(null);
  const processedUrls = useRef(new Map<string, string>());
  const currentSessionId = useRef<string>("");
  const orbitIntervalRef = useRef<number | null>(null);
  const sunSphereRef = useRef<THREE.Mesh>(null);

  // References for lights
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);

  const { scene, camera, gl: renderer } = useThree();
  const controlsRef = useRef<OrbitControlsRef | null>(null);

  // State for sun darkness based on time
  const [sunLightOpacity, setSunLightOpacity] = useState<number>(0.6);

  // Share the directional light ref with parent component
  useEffect(() => {
    if (directionalLightRef.current) {
      setLightRef(
        directionalLightRef as React.RefObject<THREE.DirectionalLight>
      );
    }
  }, [directionalLightRef.current, setLightRef]);

  // Initialize tiles renderer
  useEffect(() => {
    try {
      setIsLoading(true);
      setError(null);

      const rootUrl = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${API_KEY}`;
      const tilesRenderer = new TilesRenderer(rootUrl) as ExtendedTilesRenderer;

      tilesRenderer.registerPlugin(new TileCompressionPlugin());
      tilesRenderer.registerPlugin(new TilesFadePlugin());
      tilesRenderer.registerPlugin(
        new GLTFExtensionsPlugin({
          dracoLoader: new DRACOLoader().setDecoderPath(
            "https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/"
          ),
        })
      );

      // Quality settings
      tilesRenderer.errorTarget = 0.5;
      tilesRenderer.maxDepth = 50;
      tilesRenderer.lruCache.minSize = 2000;

      // URL processing function
      tilesRenderer.preprocessURL = (url: URL | string): string => {
        const urlString = url.toString();

        if (urlString.startsWith("blob:")) {
          return urlString;
        }

        if (processedUrls.current.has(urlString)) {
          return processedUrls.current.get(urlString) || urlString;
        }

        const sessionMatch = urlString.match(/[?&]session=([^&]+)/);
        if (sessionMatch && sessionMatch[1]) {
          currentSessionId.current = sessionMatch[1];
        }

        let processedUrl = urlString;
        if (urlString.toLowerCase().endsWith(".glb")) {
          if (urlString.includes(`key=${API_KEY}`)) {
            if (currentSessionId.current && !urlString.includes("session=")) {
              const hasParams = urlString.includes("?");
              const joinChar = hasParams ? "&" : "?";
              processedUrl = `${urlString}${joinChar}session=${currentSessionId.current}`;
            }
          } else {
            let modified = urlString;
            if (!modified.includes(`key=${API_KEY}`)) {
              const hasParams = modified.includes("?");
              const joinChar = hasParams ? "&" : "?";
              modified = `${modified}${joinChar}key=${API_KEY}`;
            }

            if (currentSessionId.current && !modified.includes("session=")) {
              modified = `${modified}&session=${currentSessionId.current}`;
            }
            processedUrl = modified;
          }
        } else {
          if (!processedUrl.includes(`key=${API_KEY}`)) {
            const hasParams = processedUrl.includes("?");
            const joinChar = hasParams ? "&" : "?";
            processedUrl = `${processedUrl}${joinChar}key=${API_KEY}`;
          }

          if (currentSessionId.current && !processedUrl.includes("session=")) {
            processedUrl = `${processedUrl}&session=${currentSessionId.current}`;
          }
        }

        processedUrls.current.set(urlString, processedUrl);
        return processedUrl;
      };

      // Add event listener for errors
      tilesRenderer.addEventListener(
        "load-error",
        (event: { error: Error }) => {
          setError(
            `Tiles loading error: ${event.error.message || "Unknown error"}`
          );
        }
      );

      // Add event listener for tile set loading
      tilesRenderer.addEventListener("load-tile-set", () => {
        const numTiles = tilesRenderer.group.children.length;
        setTileCount(numTiles);
      });

      tilesRenderer.setCamera(camera);
      tilesRenderer.setResolutionFromRenderer(camera, renderer);

      // Make sure the tiles group is visible
      tilesRenderer.group.visible = true;

      // Add the tiles group to the scene
      scene.add(tilesRenderer.group);
      tilesRendererRef.current = tilesRenderer;

      // Monitor tile loading progress
      const checkLoadProgress = () => {
        if (tilesRenderer.loadProgress !== undefined) {
          const progress = Math.round(tilesRenderer.loadProgress * 100);
          setLoadingProgress(progress);
        }

        if (tilesRenderer.rootTileSet !== null) {
          setIsLoading(false);
        } else {
          setTimeout(checkLoadProgress, 100);
        }
      };

      checkLoadProgress();

      // Initially position the camera based on the selected location
      positionCameraAtLocation(currentLocation);

      return () => {
        // Clean up resources when the component unmounts
        if (tilesRendererRef.current) {
          scene.remove(tilesRendererRef.current.group);
          tilesRendererRef.current.dispose();
          tilesRendererRef.current = null;
        }
      };
    } catch (err: any) {
      setError("Failed to initialize 3D renderer: " + err.message);
      setIsLoading(false);
    }
  }, [
    camera,
    renderer,
    scene,
    setError,
    setIsLoading,
    setLoadingProgress,
    setTileCount,
    currentLocation,
  ]);

  // Process all loaded models to force them to use standard materials
  const processLoaded3DTiles = () => {
    if (!tilesRendererRef.current) return;

    tilesRendererRef.current.onLoadModel = (model: any) => {
      console.log("Processing model:", model);

      // Process the model to manually override unlit materials
      model.scene.traverse((object: any) => {
        if (object instanceof THREE.Mesh) {
          // Enable shadows
          object.castShadow = true;
          object.receiveShadow = true;

          if (object.material) {
            const processMaterial = (material: any) => {
              // Check if this is an unlit material either by type or extension
              const isUnlitMaterial =
                material.type === "MeshBasicMaterial" ||
                (material.userData &&
                  material.userData.gltfExtensions &&
                  material.userData.gltfExtensions.KHR_materials_unlit);

              // Create a new material that will respond to lighting if needed
              if (isUnlitMaterial) {
                console.log("Converting unlit material to standard material");

                const newMaterial = new THREE.MeshStandardMaterial({
                  map: material.map,
                  color: material.color
                    ? material.color.clone()
                    : new THREE.Color(0xffffff),
                  transparent: material.transparent || false,
                  opacity:
                    material.opacity !== undefined ? material.opacity : 1.0,
                  roughness: 0.7,
                  metalness: 0.2,
                });

                return newMaterial;
              }

              return material;
            };

            if (Array.isArray(object.material)) {
              object.material = object.material.map(processMaterial);
            } else {
              object.material = processMaterial(object.material);
            }
          }
        }
      });

      return model;
    };
  };

  // Call material processing function
  useEffect(() => {
    if (tilesRendererRef.current) {
      processLoaded3DTiles();
    }
  }, [tilesRendererRef.current]);

  // Effect for handling location changes
  useEffect(() => {
    if (tilesRendererRef.current) {
      positionCameraAtLocation(currentLocation);
    }
  }, [currentLocation]);

  // Effect for handling orbiting
  useEffect(() => {
    if (orbitIntervalRef.current !== null) {
      clearInterval(orbitIntervalRef.current);
      orbitIntervalRef.current = null;
    }

    if (isOrbiting && controlsRef.current) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 2.0;
    } else if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }

    return () => {
      if (orbitIntervalRef.current !== null) {
        clearInterval(orbitIntervalRef.current);
        orbitIntervalRef.current = null;
      }
      if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }
    };
  }, [isOrbiting]);

  // Effect for handling time of day changes
  useEffect(() => {
    updateSunPosition();

    // Update the darkening sphere opacity based on time
    const hours = timeOfDay.getHours();
    if (hours < 6 || hours > 20) {
      // Night
      setSunLightOpacity(0.8);
    } else if (hours < 8 || hours > 18) {
      // Dawn/Dusk
      setSunLightOpacity(0.6);
    } else {
      // Day
      setSunLightOpacity(0.4);
    }
  }, [timeOfDay]);

  // Function to update the sun position and lighting based on time
  const updateSunPosition = () => {
    if (!directionalLightRef.current || !ambientLightRef.current) return;

    const location = PRESET_LOCATIONS[currentLocation];
    if (!location) return;

    // Calculate sun position based on time of day
    const hours = timeOfDay.getHours();
    const minutes = timeOfDay.getMinutes();
    const timeValue = hours + minutes / 60; // 0-24 value

    // Create an arc from east to west (0 at sunrise, PI at sunset)
    const sunriseHour = 6; // 6 AM
    const sunsetHour = 20; // 8 PM
    const dayLength = sunsetHour - sunriseHour;

    let sunAngle = 0;

    if (timeValue >= sunriseHour && timeValue <= sunsetHour) {
      // Day time - sun moves in an arc
      sunAngle = ((timeValue - sunriseHour) / dayLength) * Math.PI;
    } else if (timeValue < sunriseHour) {
      // Before sunrise - sun is below horizon to the east
      sunAngle = -0.2;
    } else {
      // After sunset - sun is below horizon to the west
      sunAngle = Math.PI + 0.2;
    }

    // Calculate sun position (5000 units away)
    const radius = 5000;
    const sunX = Math.cos(sunAngle) * radius;
    const sunHeight = Math.sin(sunAngle) * radius;
    const sunY = Math.max(10, sunHeight); // Prevent sun from going too far below horizon
    const sunZ = 0;

    // Update directional light position
    directionalLightRef.current.position.set(sunX, sunY, sunZ);

    // Update sun sphere position if it exists
    if (sunSphereRef.current) {
      sunSphereRef.current.position.copy(directionalLightRef.current.position);
    }

    // Set light color based on sun height
    // Lower sun = warmer colors
    let r = 1.0;
    let g = 1.0;
    let b = 1.0;

    if (sunHeight < 1000) {
      // Sunset/sunrise orange
      const t = Math.max(0, sunHeight / 1000);
      r = 1.0;
      g = 0.6 + t * 0.4;
      b = 0.3 + t * 0.7;
    }

    directionalLightRef.current.color.setRGB(r, g, b);

    // Set light intensity based on sun height
    let intensity = 0;

    if (sunHeight > 0) {
      // Day - brightness proportional to sun height
      intensity = 1.0 + (sunHeight / radius) * 2.0;
    } else {
      // Night - very dim
      intensity = 0.05;
    }

    directionalLightRef.current.intensity = intensity;
    directionalLightRef.current.castShadow = sunHeight > 0;

    // Update ambient light
    ambientLightRef.current.intensity = sunHeight > 0 ? 0.1 : 0.02;

    // Color ambient light to match time of day
    if (sunHeight < 0) {
      // Night - dark blue
      ambientLightRef.current.color.setRGB(0.1, 0.1, 0.2);
    } else if (sunHeight < 1000) {
      // Sunset/sunrise - orange tint
      ambientLightRef.current.color.setRGB(0.3, 0.2, 0.2);
    } else {
      // Day - neutral
      ambientLightRef.current.color.setRGB(0.2, 0.2, 0.3);
    }

    // Configure shadow camera
    if (sunHeight > 0) {
      const shadowSize = 5000;
      directionalLightRef.current.shadow.camera.left = -shadowSize;
      directionalLightRef.current.shadow.camera.right = shadowSize;
      directionalLightRef.current.shadow.camera.top = shadowSize;
      directionalLightRef.current.shadow.camera.bottom = -shadowSize;
      directionalLightRef.current.shadow.camera.far = 10000;

      // Update shadow camera
      directionalLightRef.current.shadow.camera.updateProjectionMatrix();
    }

    console.log(
      `Sun updated - Time: ${hours}:${minutes}, Position: [${sunX.toFixed(
        0
      )}, ${sunY.toFixed(0)}, ${sunZ.toFixed(
        0
      )}], Intensity: ${intensity.toFixed(2)}`
    );
  };

  const positionCameraAtLocation = (locationKey: string) => {
    if (!camera || !tilesRendererRef.current || !controlsRef.current) return;

    const location = PRESET_LOCATIONS[locationKey];
    if (!location) return;

    // Use setLatLonToYUp to transform coordinates
    if (tilesRendererRef.current.setLatLonToYUp) {
      tilesRendererRef.current.setLatLonToYUp(
        location.lat * THREE.MathUtils.DEG2RAD,
        location.lng * THREE.MathUtils.DEG2RAD
      );
    }

    // Set camera to a lower altitude for close-up view
    const viewingAltitude = 200;

    // Position camera looking down at a steeper angle for better close-up
    camera.position.set(
      Math.sin(location.heading * THREE.MathUtils.DEG2RAD) * viewingAltitude,
      viewingAltitude,
      Math.cos(location.heading * THREE.MathUtils.DEG2RAD) * viewingAltitude
    );

    // Look at the center (origin)
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 1, 0);

    // Ensure camera frustum is appropriate for viewing close objects
    camera.near = 1;
    camera.far = 10000;
    camera.updateProjectionMatrix();

    // Configure OrbitControls for closer viewing
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.minDistance = 50;
      controlsRef.current.maxDistance = 1000;
      controlsRef.current.update();
    }

    // Force an update of the tiles renderer
    if (tilesRendererRef.current) {
      tilesRendererRef.current.errorTarget = 2;
      tilesRendererRef.current.update();
    }

    // Update the sun position for this location
    updateSunPosition();
  };

  // Function to extract copyright info from tiles
  const extractCopyrightInfo = () => {
    if (!tilesRendererRef.current) return;

    try {
      const attributions: { value?: string }[] = [];
      tilesRendererRef.current.getAttributions(attributions);
      const copyrightSet = new Set<string>();

      attributions.forEach((attribution) => {
        if (
          attribution &&
          attribution.value &&
          typeof attribution.value === "string"
        ) {
          const copyrights = attribution.value.split(";");
          copyrights.forEach((copyright: string) => {
            copyrightSet.add(copyright.trim());
          });
        }
      });

      const combinedCopyright = Array.from(copyrightSet).join("; ");
      setCopyrightInfo(combinedCopyright);
    } catch (error) {
      // Silently fail
    }
  };

  // Animation frame with React Three Fiber's useFrame
  useFrame(() => {
    if (tilesRendererRef.current) {
      tilesRendererRef.current.update();

      // Update tile count occasionally
      if (Math.random() < 0.01) {
        const newTileCount = tilesRendererRef.current.group.children.length;
        setTileCount(newTileCount);
      }

      extractCopyrightInfo();
    }
  });

  // Create a helper function to configure 3D tiles for shadow casting/receiving
  const configureTilesForShadows = () => {
    if (!tilesRendererRef.current) return;

    // Traverse all loaded tiles and enable shadow casting/receiving
    tilesRendererRef.current.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;

        // If the mesh has a material, make sure it can handle shadows
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => {
              // Ensure the material properties are set for shadows
              mat.needsUpdate = true;

              // If material has emissive property, ensure it's black (no self-illumination)
              if ("emissive" in mat) {
                mat.emissive = new THREE.Color(0x000000);
                mat.emissiveIntensity = 0;
              }

              // If it's a standard material, ensure shadow settings
              if (
                mat.type.includes("MeshStandard") ||
                mat.type.includes("MeshPhysical")
              ) {
                mat.roughness = Math.max(0.4, mat.roughness || 0);
                mat.metalness = Math.min(0.3, mat.metalness || 0);
              }
            });
          } else {
            // Ensure the material properties are set for shadows
            object.material.needsUpdate = true;

            // If material has emissive property, ensure it's black (no self-illumination)
            if ("emissive" in object.material) {
              object.material.emissive = new THREE.Color(0x000000);
              object.material.emissiveIntensity = 0;
            }

            // If it's a standard material, ensure shadow settings
            if (
              object.material.type.includes("MeshStandard") ||
              object.material.type.includes("MeshPhysical")
            ) {
              object.material.roughness = Math.max(
                0.4,
                object.material.roughness || 0
              );
              object.material.metalness = Math.min(
                0.3,
                object.material.metalness || 0
              );
            }
          }
        }
      }
    });
  };

  // Apply shadow configuration when tiles load
  useEffect(() => {
    if (!tilesRendererRef.current) return;

    // Function to check and update shadows periodically
    const updateShadowsInterval = setInterval(() => {
      configureTilesForShadows();
    }, 1000); // Check every second to catch newly loaded tiles

    return () => {
      clearInterval(updateShadowsInterval);
    };
  }, [tilesRendererRef.current]);

  return (
    <>
      {/* Scene fog */}
      <fog attach="fog" args={["#0a1622", 100, 5000]} />

      {/* Darkening sphere */}
      <mesh position={[0, 0, 0]} scale={[10000, 10000, 10000]} renderOrder={-1}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#000000"
          transparent={true}
          opacity={sunLightOpacity} // This changes based on time of day
          side={THREE.BackSide}
        />
      </mesh>

      {/* Ambient light */}
      <ambientLight
        ref={ambientLightRef}
        intensity={0.02}
        color={new THREE.Color(0x111122)}
      />

      {/* Directional light (sun) */}
      <directionalLight
        ref={directionalLightRef}
        position={[1000, 1000, 1000]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-5000}
        shadow-camera-right={5000}
        shadow-camera-top={5000}
        shadow-camera-bottom={-5000}
        shadow-camera-far={10000}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
        color={0xffffff}
      />

      {/* Visual sun representation */}
      <mesh
        ref={sunSphereRef}
        position={[1000, 1000, 1000]} // Initial position, will be updated
        scale={50} // Make it visible from a distance
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#FFF176" />
      </mesh>

      {/* Shadow camera helper (if enabled) */}
      {showShadowHelper && directionalLightRef.current && (
        <cameraHelper args={[directionalLightRef.current.shadow.camera]} />
      )}

      {/* Orbit controls */}
      <OrbitControls
        ref={controlsRef as React.RefObject<any>}
        enableDamping
        dampingFactor={0.1}
        screenSpacePanning={false}
        maxPolarAngle={Math.PI / 2}
        minDistance={100}
        maxDistance={1000000}
      />

      {/* Test objects */}
      {/* Large ground plane for shadows */}
      <mesh
        position={[0, -10, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial
          color="#333333"
          transparent
          opacity={0.6}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Test buildings */}
      <group position={[0, 0, 0]}>
        {/* Large building in center */}
        <mesh castShadow receiveShadow position={[0, 100, 0]}>
          <boxGeometry args={[100, 200, 100]} />
          <meshStandardMaterial
            color="#B0BEC5"
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>

        {/* Smaller building nearby */}
        <mesh castShadow receiveShadow position={[200, 50, 200]}>
          <boxGeometry args={[80, 100, 80]} />
          <meshStandardMaterial
            color="#90A4AE"
            roughness={0.6}
            metalness={0.3}
          />
        </mesh>

        {/* Another building */}
        <mesh castShadow receiveShadow position={[-200, 75, -100]}>
          <boxGeometry args={[120, 150, 90]} />
          <meshStandardMaterial
            color="#78909C"
            roughness={0.5}
            metalness={0.4}
          />
        </mesh>

        {/* Small test cube */}
        <mesh position={[0, 20, 0]} castShadow receiveShadow>
          <boxGeometry args={[50, 50, 50]} />
          <meshStandardMaterial color="white" />
        </mesh>
      </group>
    </>
  );
};

export default TilesScene;
