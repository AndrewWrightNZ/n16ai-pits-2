import { useRef, useEffect } from "react";
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
}: TilesSceneProps) => {
  const tilesRendererRef = useRef<ExtendedTilesRenderer | null>(null);
  const processedUrls = useRef(new Map<string, string>());
  const currentSessionId = useRef<string>("");
  const orbitIntervalRef = useRef<number | null>(null);

  // References for lights
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);

  const { scene, camera, gl: renderer } = useThree();
  const controlsRef = useRef<OrbitControlsRef | null>(null);

  // And in useEffect, call it:
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
  }, [timeOfDay]);

  // Function to update the sun position and lighting based on time
  const updateSunPosition = () => {
    if (!directionalLightRef.current || !ambientLightRef.current) return;

    const location = PRESET_LOCATIONS[currentLocation];
    if (!location) return;

    // Calculate sun position based on time and location
    const sunPos = sun.calculateSunPosition(
      timeOfDay,
      location.lat,
      location.lng
    );

    // Update directional light position to match sun
    directionalLightRef.current.position.set(sunPos.x, sunPos.y, sunPos.z);

    // Update directional light color and intensity
    directionalLightRef.current.color = sun.calculateSunColor(sunPos.elevation);
    directionalLightRef.current.intensity = sun.calculateLightIntensity(
      sunPos.elevation
    );

    // Update ambient light
    const ambientSettings = sun.calculateAmbientLight(sunPos.elevation);
    ambientLightRef.current.color = ambientSettings.color;
    ambientLightRef.current.intensity = ambientSettings.intensity;

    // Configure shadows based on time of day
    if (sunPos.elevation > 0) {
      // Day time - enable shadows
      directionalLightRef.current.castShadow = true;

      // Configure shadow properties based on sun height
      const shadowSize = 5000; // Size of shadow camera (adjust based on your scene)
      directionalLightRef.current.shadow.camera.left = -shadowSize;
      directionalLightRef.current.shadow.camera.right = shadowSize;
      directionalLightRef.current.shadow.camera.top = shadowSize;
      directionalLightRef.current.shadow.camera.bottom = -shadowSize;

      // Adjust shadow quality based on sun elevation
      // Higher quality at sunrise/sunset when shadows are most dramatic
      if (sunPos.elevation < 20) {
        directionalLightRef.current.shadow.mapSize.width = 4096;
        directionalLightRef.current.shadow.mapSize.height = 4096;
        directionalLightRef.current.shadow.camera.far = 10000;
      } else {
        directionalLightRef.current.shadow.mapSize.width = 2048;
        directionalLightRef.current.shadow.mapSize.height = 2048;
        directionalLightRef.current.shadow.camera.far = 5000;
      }

      // Update the shadow camera
      directionalLightRef.current.shadow.camera.updateProjectionMatrix();

      // For better shadow visuals
      directionalLightRef.current.shadow.bias = -0.0001;
      directionalLightRef.current.shadow.normalBias = 0.02;
    } else {
      // Night time - disable shadows
      directionalLightRef.current.castShadow = false;
    }
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
              mat.needsUpdate = true;
            });
          } else {
            object.material.needsUpdate = true;
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
      {/* Ambient light */}
      {/* <ambientLight
        ref={ambientLightRef}
        intensity={0.7}
        color={new THREE.Color(0xaabbcc)}
      /> */}

      {/* Directional light (sun) */}
      {/* <directionalLight
        ref={directionalLightRef}
        position={[1000, 1000, 1000]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-5000}
        shadow-camera-right={5000}
        shadow-camera-top={5000}
        shadow-camera-bottom={-5000}
        shadow-camera-far={10000}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      /> */}

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
    </>
  );
};

export default TilesScene;
