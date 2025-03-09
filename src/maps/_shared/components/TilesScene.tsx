import { useRef, useEffect, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";

// 3D Tiles modules
import { TilesRenderer } from "3d-tiles-renderer";
import {
  GLTFExtensionsPlugin,
  TileCompressionPlugin,
} from "3d-tiles-renderer/plugins";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// If using Cascade Shadow Maps (CSM):
import { CSM } from "../csm"; // adjust path as needed
import { PRESET_LOCATIONS } from "../hooks/locationsData";

// Import the TilesShadowWrapper component
import TilesShadowWrapper from "./TilesShadowWrapper";

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

type ExtendedTilesRenderer = TilesRenderer & {
  loadProgress?: number;
  setLatLonToYUp?: (lat: number, lon: number) => void;
  getAttributions?: (arr: any[]) => void;
  rootTileSet?: any;
};

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function TilesScene({
  currentLocation,
  isOrbiting,
  timeOfDay,
  setTileCount,
  setCopyrightInfo,
  setIsLoading,
  setError,
  setLoadingProgress,
  setLightRef,
}: TilesSceneProps) {
  const tilesRendererRef = useRef<ExtendedTilesRenderer | null>(null);
  const processedUrls = useRef(new Map<string, string>());
  const currentSessionId = useRef<string>("");

  const orbitControlsRef = useRef<any>(null);

  // R3F hooks
  const { scene, camera, gl: renderer } = useThree();
  const [tilesLoaded, setTilesLoaded] = useState(false);

  // Shadow opacity based on time of day
  const [shadowOpacity, setShadowOpacity] = useState(0.3);

  // Create CSM for large scale shadows
  const csmRef = useRef<CSM | null>(null);

  // Ensure renderer has shadow map enabled
  useEffect(() => {
    if (renderer) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
  }, [renderer]);

  // Create and update CSM when timeOfDay changes
  useEffect(() => {
    if (csmRef.current) {
      csmRef.current.remove();
      csmRef.current.dispose();
      csmRef.current = null;
    }
    const hours = timeOfDay.getHours() + timeOfDay.getMinutes() / 60;
    const sunriseHour = 6;
    const sunsetHour = 20;
    const dayLength = sunsetHour - sunriseHour;
    let sunAngle = 0;
    if (hours >= sunriseHour && hours <= sunsetHour) {
      sunAngle = ((hours - sunriseHour) / dayLength) * Math.PI;
    } else if (hours < sunriseHour) {
      sunAngle = -0.2;
    } else {
      sunAngle = Math.PI + 0.2;
    }

    const lightDirection = new THREE.Vector3(
      -Math.cos(sunAngle),
      -Math.max(0.1, Math.sin(sunAngle)),
      0.5
    ).normalize();

    const csm = new CSM({
      camera,
      parent: scene,
      cascades: 3,
      maxFar: 10000,
      mode: "practical",
      shadowMapSize: 4096,
      shadowBias: -0.0001,
      lightDirection: lightDirection,
      lightIntensity: 2.0,
      lightNear: 1,
      lightFar: 10000,
      lightMargin: 500,
      fade: false,
    });
    csmRef.current = csm;
    if (csm.lights.length > 0) {
      setLightRef(csm.lights[0] as any);
      csm.lights.forEach((light) => {
        light.castShadow = true;
        light.shadow.mapSize.width = 4096;
        light.shadow.mapSize.height = 4096;
        light.shadow.camera.near = 10;
        light.shadow.camera.far = 10000;
        light.shadow.bias = -0.0003;
        light.shadow.normalBias = 0.02;
        light.shadow.radius = 1;
      });
    }
    return () => {
      if (csmRef.current) {
        csmRef.current.remove();
        csmRef.current.dispose();
        csmRef.current = null;
      }
    };
  }, [scene, camera, setLightRef, timeOfDay]);

  // Initialize 3D Tiles
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setTilesLoaded(false);

    const rootUrl = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${API_KEY}`;
    const tilesRenderer = new TilesRenderer(rootUrl) as ExtendedTilesRenderer;

    tilesRenderer.registerPlugin(new TileCompressionPlugin());
    tilesRenderer.registerPlugin(
      new GLTFExtensionsPlugin({
        dracoLoader: new DRACOLoader().setDecoderPath(
          "https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/"
        ),
      })
    );
    tilesRenderer.errorTarget = 0.5;
    tilesRenderer.maxDepth = 50;
    tilesRenderer.lruCache.minSize = 2000;
    tilesRenderer.preprocessURL = (url: URL | string): string => {
      const urlString = url.toString();
      if (urlString.startsWith("blob:")) return urlString;
      if (processedUrls.current.has(urlString)) {
        return processedUrls.current.get(urlString)!;
      }
      const sessionMatch = urlString.match(/[?&]session=([^&]+)/);
      if (sessionMatch && sessionMatch[1]) {
        currentSessionId.current = sessionMatch[1];
      }
      let processedUrl = urlString;
      if (!processedUrl.includes(`key=${API_KEY}`)) {
        const joinChar = processedUrl.includes("?") ? "&" : "?";
        processedUrl = `${processedUrl}${joinChar}key=${API_KEY}`;
      }
      if (currentSessionId.current && !processedUrl.includes("session=")) {
        processedUrl = `${processedUrl}&session=${currentSessionId.current}`;
      }
      processedUrls.current.set(urlString, processedUrl);
      return processedUrl;
    };

    // Set up shadow casting for tiles once loaded - UPDATED TO RECURSIVE VERSION
    // Set up shadow casting for tiles once loaded - HANDLES ASYNC LOADED CHILDREN
    const setupShadowsForTiles = () => {
      const processedMaterials = new Set();
      const processedObjects = new Set<string>(); // Track processed objects by UUID

      console.log("Setting up shadows for tiles");

      // Function to apply shadow settings to an object
      const applyShadowSettings = (object: any) => {
        // Skip if this object was already processed
        if (object.uuid && processedObjects.has(object.uuid)) {
          return;
        }

        // Mark as processed
        if (object.uuid) {
          processedObjects.add(object.uuid);
        }

        console.log(
          "Processing object:",
          object.name || object.type || "unnamed"
        );

        // Handle different object types
        if (object instanceof THREE.Mesh) {
          console.log(
            "Setting shadows for Mesh:",
            object.name || "unnamed mesh"
          );
          object.castShadow = true;
          object.receiveShadow = true;

          // Process materials
          if (object.material) {
            const materials = Array.isArray(object.material)
              ? object.material
              : [object.material];

            materials.forEach((material) => {
              if (material.uuid && processedMaterials.has(material.uuid)) {
                return;
              }
              if (material.uuid) {
                processedMaterials.add(material.uuid);
              }
              material.needsUpdate = true;
            });
          }
        } else if (object instanceof THREE.Light) {
          console.log(
            "Setting shadows for Light:",
            object.name || "unnamed light"
          );
          object.castShadow = true;

          if (object.shadow) {
            object.shadow.mapSize.width = 2048;
            object.shadow.mapSize.height = 2048;
            object.shadow.bias = -0.0003;
          }
        } else if (object.isObject3D) {
          // Handle any Object3D including custom types like TilesGroup
          console.log(
            "Processing Object3D or custom type:",
            object.constructor.name,
            object.name || "unnamed"
          );

          if ("castShadow" in object) {
            object.castShadow = true;
          }

          if ("receiveShadow" in object) {
            object.receiveShadow = true;
          }
        }

        // Process all immediate children
        if (object.children && object.children.length > 0) {
          console.log(
            `Processing ${object.children.length} children of:`,
            object.name || object.type || "unnamed"
          );
          object.children.forEach((child: any) => applyShadowSettings(child));
        }

        console.log("Finished processing object: ", object);
      };

      // Initial application to current objects
      applyShadowSettings(tilesRenderer.group);

      // Set up a MutationObserver-like approach using a recurring check
      // This handles objects loaded after initial processing
      const checkForNewObjects = () => {
        let newObjectsFound = false;

        // Recursive function to find and process new objects
        const findNewObjects = (object: any) => {
          // Check if this object is new
          if (object.uuid && !processedObjects.has(object.uuid)) {
            applyShadowSettings(object);
            newObjectsFound = true;
            return;
          }

          // Check its children
          if (object.children && object.children.length > 0) {
            object.children.forEach((child: any) => findNewObjects(child));
          }
        };

        // Start from the top group
        findNewObjects(tilesRenderer.group);

        // Schedule another check if changes were found or we're still expecting more tiles
        if (
          newObjectsFound ||
          !tilesRenderer.rootTileSet ||
          tilesRendererRef.current?.loadProgress !== 1
        ) {
          setTimeout(checkForNewObjects, 500); // Check every half second
        }
      };

      // Start checking for new objects after a short delay
      setTimeout(checkForNewObjects, 500);

      console.log(
        "Initial shadow setup complete, continuing to monitor for new tiles"
      );
    };

    tilesRenderer.addEventListener("load-error", (ev: any) => {
      setError(`Tiles loading error: ${ev.error?.message || "Unknown"}`);
    });
    tilesRenderer.addEventListener("load-tile-set", () => {
      setupShadowsForTiles();
      setTileCount(tilesRenderer.group.children.length);
      if (tilesRenderer.rootTileSet) {
        setTilesLoaded(true);
      }
    });

    tilesRenderer.setCamera(camera);
    tilesRenderer.setResolutionFromRenderer(camera, renderer);
    tilesRenderer.group.visible = true;
    scene.add(tilesRenderer.group);
    tilesRendererRef.current = tilesRenderer;

    // Periodically check loading progress
    const checkLoadProgress = () => {
      if (tilesRenderer.loadProgress !== undefined) {
        const prog = Math.round(tilesRenderer.loadProgress * 100);
        setLoadingProgress(prog);
      }
      if (tilesRenderer.rootTileSet !== null) {
        setIsLoading(false);
        setTilesLoaded(true);
      } else {
        setTimeout(checkLoadProgress, 100);
      }
    };
    checkLoadProgress();

    // Position the camera for the current location
    positionCameraAtLocation(currentLocation);

    return () => {
      if (tilesRendererRef.current) {
        scene.remove(tilesRendererRef.current.group);
        tilesRendererRef.current.dispose();
        tilesRendererRef.current = null;
        setTilesLoaded(false);
      }
    };
  }, [
    camera,
    renderer,
    scene,
    currentLocation,
    setIsLoading,
    setError,
    setLoadingProgress,
    setTileCount,
  ]);

  // Reposition camera when location changes
  useEffect(() => {
    if (tilesRendererRef.current) {
      positionCameraAtLocation(currentLocation);
    }
  }, [currentLocation]);

  // Toggle orbit controls
  useEffect(() => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.autoRotate = isOrbiting;
      orbitControlsRef.current.autoRotateSpeed = 2.0;
    }
  }, [isOrbiting]);

  // Update time-of-day: adjust shadow opacity and update CSM
  useEffect(() => {
    const hours = timeOfDay.getHours();
    if (hours < 6 || hours > 20) {
      setShadowOpacity(0.8);
    } else if (hours < 8 || hours > 18) {
      setShadowOpacity(0.7);
    } else {
      setShadowOpacity(0.6);
    }
    if (csmRef.current) {
      const hours = timeOfDay.getHours() + timeOfDay.getMinutes() / 60;
      const sunriseHour = 6;
      const sunsetHour = 20;
      const dayLength = sunsetHour - sunriseHour;
      let sunAngle = 0;
      if (hours >= sunriseHour && hours <= sunsetHour) {
        sunAngle = ((hours - sunriseHour) / dayLength) * Math.PI;
      } else if (hours < sunriseHour) {
        sunAngle = -0.2;
      } else {
        sunAngle = Math.PI + 0.2;
      }
      const lightDirection = new THREE.Vector3(
        -Math.cos(sunAngle),
        -Math.max(0.1, Math.sin(sunAngle)),
        0.5
      ).normalize();
      csmRef.current.lightDirection = lightDirection;
      csmRef.current.updateFrustums();
      csmRef.current.update();
    }
  }, [timeOfDay]);

  // Helper: apply tile transformations using the current location.
  // This mimics previous transformation logic (lat/lon to Y‑up plus heading rotation).
  function applyTileTransformations(lat: number, lng: number, heading: number) {
    if (tilesRendererRef.current) {
      if (tilesRendererRef.current.setLatLonToYUp) {
        // Use the built-in method if available
        tilesRendererRef.current.setLatLonToYUp(
          lat * THREE.MathUtils.DEG2RAD,
          lng * THREE.MathUtils.DEG2RAD
        );
      } else {
        // Fallback: rotate tiles group so that Z becomes up, then apply heading rotation.
        // First, rotate -90° about X to get Y up.
        const baseEuler = new THREE.Euler(-Math.PI / 2, 0, 0, "XYZ");
        // Then apply additional rotation around Y (up) axis based on heading.
        const headingEuler = new THREE.Euler(
          0,
          heading * THREE.MathUtils.DEG2RAD,
          0,
          "XYZ"
        );
        // Combine rotations
        const combined = new THREE.Euler().setFromQuaternion(
          new THREE.Quaternion()
            .setFromEuler(baseEuler)
            .multiply(new THREE.Quaternion().setFromEuler(headingEuler))
        );
        tilesRendererRef.current.group.rotation.copy(combined);
      }
    }
  }

  // Position camera and align tile set for the chosen location.
  function positionCameraAtLocation(locKey: string) {
    if (!camera || !tilesRendererRef.current || !orbitControlsRef.current)
      return;
    const loc = PRESET_LOCATIONS[locKey];
    if (!loc) return;

    // Apply tile transformations (lat, lng and heading) to align the tiles.
    applyTileTransformations(loc.lat, loc.lng, loc.heading || 0);

    // Position camera relative to the transformed tile set.
    const viewingAltitude = 200;
    camera.position.set(
      Math.sin(loc.heading * THREE.MathUtils.DEG2RAD) * viewingAltitude,
      viewingAltitude,
      Math.cos(loc.heading * THREE.MathUtils.DEG2RAD) * viewingAltitude
    );
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.near = 1;
    camera.far = 20000;
    camera.updateProjectionMatrix();

    orbitControlsRef.current.target.set(0, 0, 0);
    orbitControlsRef.current.minDistance = 50;
    orbitControlsRef.current.maxDistance = 1000;
    orbitControlsRef.current.update();

    if (tilesRendererRef.current) {
      tilesRendererRef.current.errorTarget = 2;
      tilesRendererRef.current.update();
    }

    if (csmRef.current) {
      csmRef.current.updateFrustums();
      csmRef.current.update();
    }
  }

  // Render loop: update tiles and CSM.
  useFrame(({ clock }) => {
    if (tilesRendererRef.current) {
      tilesRendererRef.current.update();
      if (Math.random() < 0.01) {
        setTileCount(tilesRendererRef.current.group.children.length);
      }
      try {
        const arr: any[] = [];
        tilesRendererRef.current.getAttributions?.(arr);
        const cSet = new Set<string>();
        arr.forEach((a) => {
          if (a?.value) {
            a.value.split(";").forEach((c: string) => cSet.add(c.trim()));
          }
        });
        const cStr = Array.from(cSet).join("; ");
        if (cStr) {
          setCopyrightInfo(cStr);
        }
      } catch {}
    }
    if (csmRef.current) {
      const hours = timeOfDay.getHours() + timeOfDay.getMinutes() / 60;
      const sunriseHour = 6;
      const sunsetHour = 20;
      const dayLength = sunsetHour - sunriseHour;
      let sunAngle = 0;
      if (hours >= sunriseHour && hours <= sunsetHour) {
        sunAngle = ((hours - sunriseHour) / dayLength) * Math.PI;
      } else if (hours < sunriseHour) {
        sunAngle = -0.2;
      } else {
        sunAngle = Math.PI + 0.2;
      }
      const wobble = Math.sin(clock.getElapsedTime() * 0.1) * 0.001;
      const newLightDirection = new THREE.Vector3(
        -Math.cos(sunAngle + wobble),
        -Math.max(0.1, Math.sin(sunAngle + wobble)),
        0.5
      ).normalize();
      csmRef.current.lightDirection = newLightDirection;
      csmRef.current.update();
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} color={new THREE.Color(0xffffff)} />
      {tilesLoaded && tilesRendererRef.current && (
        <TilesShadowWrapper
          tilesGroup={tilesRendererRef.current.group}
          shadowOpacity={shadowOpacity}
        />
      )}
      <OrbitControls
        ref={orbitControlsRef}
        enableDamping
        dampingFactor={0.1}
        screenSpacePanning={false}
        maxPolarAngle={Math.PI / 2}
        minDistance={100}
        maxDistance={1000000}
      />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 60, 0]}>
        <planeGeometry args={[500, 500]} />
        <shadowMaterial transparent opacity={0.8} color={0x000000} />
      </mesh>
    </>
  );
}
