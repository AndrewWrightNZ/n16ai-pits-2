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
import WhiteTilesMaterial from "./WhiteTilesMaterial";
import MultiLayerGround from "./MultiLayerGround";
import WhiteSceneControls from "./WhiteSceneControls";

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

// Shadow material pool for reuse
const createShadowMaterialPool = (size = 10) => {
  const pool = [];
  for (let i = 0; i < size; i++) {
    pool.push(
      new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
      })
    );
  }
  return pool;
};

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
  const prevTimeRef = useRef<Date | null>(null);
  const countUpdateRef = useRef<boolean>(false);
  const shadowMaterialPoolRef = useRef(createShadowMaterialPool());
  const lastCopyrightUpdateRef = useRef<number>(0);
  const lastShadowUpdateTimeRef = useRef<number>(0);

  // R3F hooks
  const { scene, camera, gl: renderer } = useThree();
  const [tilesLoaded, setTilesLoaded] = useState(false);

  // Scene settings
  const [whiteSceneEnabled, setWhiteSceneEnabled] = useState(true);
  const [buildingBrightness, setBuildingBrightness] = useState(1.0);
  const [groundHeight, setGroundHeight] = useState(60); // Initial ground height
  const [shadowIntensity, setShadowIntensity] = useState(0.8);
  const [performanceMode, setPerformanceMode] = useState(false);

  // Shadow opacity based on time of day
  const [shadowOpacity, setShadowOpacity] = useState(0.3);

  // Create CSM for large scale shadows
  const csmRef = useRef<CSM | null>(null);

  // Helper function to get/release shadow materials from pool
  const getShadowMaterial = () => {
    return (
      shadowMaterialPoolRef.current.pop() ||
      new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
      })
    );
  };

  const releaseShadowMaterial = (material: THREE.Material) => {
    if (shadowMaterialPoolRef.current.length < 20) {
      shadowMaterialPoolRef.current.push(material as THREE.MeshDepthMaterial);
    }
  };

  // Ensure renderer has shadow map enabled with appropriate settings
  useEffect(() => {
    if (renderer) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = performanceMode
        ? THREE.BasicShadowMap // Faster but lower quality
        : THREE.PCFSoftShadowMap; // Higher quality but slower
    }
  }, [renderer, performanceMode]);

  // Create and update CSM when timeOfDay changes
  useEffect(() => {
    // Cache previous time to avoid unnecessary updates
    const prevHour = Math.floor(prevTimeRef.current?.getHours() || -1);
    const currHour = Math.floor(timeOfDay.getHours());

    // Only update if hour has changed or no CSM exists yet
    if (prevHour !== currHour || !csmRef.current) {
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

      // Use reduced shadow quality in performance mode
      const shadowMapSize = performanceMode ? 2048 : 4096;
      const cascades = performanceMode ? 2 : 3;

      const csm = new CSM({
        camera,
        parent: scene,
        cascades: cascades,
        maxFar: 10000,
        mode: "practical",
        shadowMapSize: shadowMapSize,
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
          light.shadow.mapSize.width = shadowMapSize;
          light.shadow.mapSize.height = shadowMapSize;
          light.shadow.camera.near = 10;
          light.shadow.camera.far = 10000;
          light.shadow.bias = -0.0003;
          light.shadow.normalBias = 0.02;
          light.shadow.radius = 1;
        });
      }
    }

    // Save current time for next comparison
    prevTimeRef.current = timeOfDay;

    return () => {
      if (csmRef.current) {
        csmRef.current.remove();
        csmRef.current.dispose();
        csmRef.current = null;
      }
    };
  }, [scene, camera, setLightRef, timeOfDay, performanceMode]);

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

    // Adjust error target based on performance mode
    tilesRenderer.errorTarget = performanceMode ? 1.0 : 0.5; // Higher = less detail but better performance
    tilesRenderer.maxDepth = performanceMode ? 30 : 50; // Lower = fewer tile subdivisions
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

    // Set up shadow casting for tiles once loaded - OPTIMIZED VERSION
    const setupShadowsForTiles = () => {
      const processedMaterials = new Set();
      const processedObjects = new Set<string>(); // Track processed objects by UUID

      // Function to apply shadow settings to an object with distance-based LOD
      const applyShadowSettings = (object: any) => {
        // Skip if this object was already processed
        if (object.uuid && processedObjects.has(object.uuid)) {
          return;
        }

        // Mark as processed
        if (object.uuid) {
          processedObjects.add(object.uuid);
        }

        // Handle different object types
        if (object instanceof THREE.Mesh) {
          // Apply distance-based LOD for shadow casting
          const distanceToCamera = camera.position.distanceTo(object.position);
          const shadowCastDistance = performanceMode ? 300 : 500;

          if (distanceToCamera < shadowCastDistance) {
            object.castShadow = true;
          } else {
            object.castShadow = false; // Too far to cast shadows
          }

          // Always receive shadows (with less impact on performance)
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
              // Only update material if really needed
              if (material.needsUpdate === false) {
                material.needsUpdate = true;
              }
            });
          }
        } else if (object instanceof THREE.Light) {
          object.castShadow = true;

          if (object.shadow) {
            const shadowMapSize = performanceMode ? 1024 : 2048;
            object.shadow.mapSize.width = shadowMapSize;
            object.shadow.mapSize.height = shadowMapSize;
            object.shadow.bias = -0.0003;
          }
        } else if (object.isObject3D) {
          // Handle any Object3D including custom types like TilesGroup
          if ("castShadow" in object) {
            object.castShadow = true;
          }

          if ("receiveShadow" in object) {
            object.receiveShadow = true;
          }
        }

        // Process all immediate children
        if (object.children && object.children.length > 0) {
          object.children.forEach((child: any) => applyShadowSettings(child));
        }
      };

      // Initial application to current objects
      applyShadowSettings(tilesRenderer.group);

      // Optimized approach to check for new objects - uses adaptive timing
      const checkForNewObjects = () => {
        let newObjectsFound = false;
        let objectsChecked = 0;
        const MAX_OBJECTS_PER_CHECK = 100; // Limit how many objects we process at once

        // Recursive function to find and process new objects
        const findNewObjects = (object: any) => {
          // Limit checks per frame to avoid performance spikes
          if (objectsChecked > MAX_OBJECTS_PER_CHECK) return;

          // Check if this object is new
          if (object.uuid && !processedObjects.has(object.uuid)) {
            applyShadowSettings(object);
            newObjectsFound = true;
            objectsChecked++;
            return;
          }

          // Check its children
          if (object.children && object.children.length > 0) {
            for (
              let i = 0;
              i < object.children.length &&
              objectsChecked <= MAX_OBJECTS_PER_CHECK;
              i++
            ) {
              findNewObjects(object.children[i]);
            }
          }
        };

        // Start from the top group
        findNewObjects(tilesRenderer.group);

        // Adaptive timing for next check based on loading state
        if (newObjectsFound || !tilesRenderer.rootTileSet) {
          // If many objects are still loading, check less frequently
          if (tilesRendererRef.current?.loadProgress) {
            const checkDelay =
              tilesRendererRef.current?.loadProgress < 0.5 ? 2000 : 500;
            setTimeout(checkForNewObjects, checkDelay);
          }
        } else if (tilesRendererRef.current?.loadProgress !== 1) {
          // Almost done loading, check occasionally
          setTimeout(checkForNewObjects, 1000);
        } else if (objectsChecked >= MAX_OBJECTS_PER_CHECK) {
          // We hit our processing limit, need to continue checking
          setTimeout(checkForNewObjects, 100);
        }
        // If no new objects and fully loaded, we're done checking
      };

      // Start checking for new objects after a short delay
      setTimeout(checkForNewObjects, 500);
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

    // Optimized progress checking with exponential backoff
    const checkLoadProgress = (interval = 100) => {
      if (tilesRenderer.loadProgress !== undefined) {
        const prog = Math.round(tilesRenderer.loadProgress * 100);
        setLoadingProgress(prog);
      }

      if (tilesRenderer.rootTileSet !== null) {
        setIsLoading(false);
        setTilesLoaded(true);
      } else {
        // Gradually increase check interval as time passes
        const nextInterval = Math.min(interval * 1.2, 1000); // Cap at 1 second
        setTimeout(() => checkLoadProgress(nextInterval), interval);
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
    performanceMode,
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
      orbitControlsRef.current.autoRotateSpeed = performanceMode ? 1.0 : 2.0;
    }
  }, [isOrbiting, performanceMode]);

  // Update time-of-day: adjust shadow opacity and update CSM
  useEffect(() => {
    const hours = timeOfDay.getHours();

    // Simplified shadow opacity calculation
    if (hours < 6 || hours > 20) {
      setShadowOpacity(0.8);
    } else if (hours < 8 || hours > 18) {
      setShadowOpacity(0.7);
    } else {
      setShadowOpacity(0.6);
    }

    // Only update CSM if needed and if enough time has passed since last update
    const now = Date.now();
    if (csmRef.current && now - lastShadowUpdateTimeRef.current > 1000) {
      // Limit updates to once per second
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

      // Only update frustums/shadows if not in performance mode or time is changing significantly
      if (
        !performanceMode ||
        Math.abs(
          hours -
            (prevTimeRef.current?.getHours() || 0) -
            (prevTimeRef.current?.getMinutes() || 0) / 60
        ) > 0.25
      ) {
        csmRef.current.updateFrustums();
        csmRef.current.update();
      }

      lastShadowUpdateTimeRef.current = now;
    }
  }, [timeOfDay, performanceMode]);

  // Helper: apply tile transformations using the current location.
  function applyTileTransformations(lat: number, lng: number, heading: number) {
    if (tilesRendererRef.current) {
      if (tilesRendererRef.current.setLatLonToYUp) {
        // Use the built-in method if available
        tilesRendererRef.current.setLatLonToYUp(
          lat * THREE.MathUtils.DEG2RAD,
          lng * THREE.MathUtils.DEG2RAD
        );
      } else {
        // Fallback: rotate tiles group
        const baseEuler = new THREE.Euler(-Math.PI / 2, 0, 0, "XYZ");
        const headingEuler = new THREE.Euler(
          0,
          heading * THREE.MathUtils.DEG2RAD,
          0,
          "XYZ"
        );

        // Use cached quaternions for better performance
        const baseQuat = new THREE.Quaternion().setFromEuler(baseEuler);
        const headingQuat = new THREE.Quaternion().setFromEuler(headingEuler);
        baseQuat.multiply(headingQuat);

        const combined = new THREE.Euler().setFromQuaternion(baseQuat);
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
    const headingRad = loc.heading * THREE.MathUtils.DEG2RAD;

    camera.position.set(
      Math.sin(headingRad) * viewingAltitude,
      viewingAltitude,
      Math.cos(headingRad) * viewingAltitude
    );

    camera.lookAt(0, 0, 0);
    camera.up.set(0, 1, 0);

    // Adjust near/far planes based on performance mode
    camera.near = 1;
    camera.far = performanceMode ? 10000 : 20000;
    camera.updateProjectionMatrix();

    orbitControlsRef.current.target.set(0, 0, 0);
    orbitControlsRef.current.minDistance = 50;
    orbitControlsRef.current.maxDistance = performanceMode ? 800 : 1000;
    orbitControlsRef.current.update();

    if (tilesRendererRef.current) {
      // Adjust error target based on performance mode
      tilesRendererRef.current.errorTarget = performanceMode ? 4 : 2;
      tilesRendererRef.current.update();
    }

    if (csmRef.current) {
      csmRef.current.updateFrustums();
      csmRef.current.update();
    }
  }

  // Optimized render loop: update tiles and CSM.
  useFrame(({ clock }) => {
    // Always update tiles renderer
    if (tilesRendererRef.current) {
      tilesRendererRef.current.update();

      // Only update tile count every 5 seconds instead of randomly
      const elapsedSeconds = Math.floor(clock.getElapsedTime());
      if (elapsedSeconds % 5 === 0 && !countUpdateRef.current) {
        setTileCount(tilesRendererRef.current.group.children.length);
        countUpdateRef.current = true;
      } else if (elapsedSeconds % 5 !== 0) {
        countUpdateRef.current = false;
      }

      // Throttle copyright updates to once every 10 seconds
      const now = Date.now();
      if (now - lastCopyrightUpdateRef.current > 10000) {
        // 10 seconds
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
          lastCopyrightUpdateRef.current = now;
        } catch {}
      }
    }

    // Update CSM with reduced frequency in performance mode
    if (
      csmRef.current &&
      (!performanceMode || clock.getElapsedTime() % 0.5 < 0.1)
    ) {
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

      // Reduce light wobble in performance mode
      const wobbleFactor = performanceMode ? 0.0005 : 0.001;
      const wobble = Math.sin(clock.getElapsedTime() * 0.1) * wobbleFactor;

      const newLightDirection = new THREE.Vector3(
        -Math.cos(sunAngle + wobble),
        -Math.max(0.1, Math.sin(sunAngle + wobble)),
        0.5
      ).normalize();

      csmRef.current.lightDirection = newLightDirection;

      // Full update every frame in normal mode, less frequent in performance mode
      if (
        !performanceMode ||
        Math.floor(clock.getElapsedTime() * 2) % 2 === 0
      ) {
        csmRef.current.update();
      }
    }
  });

  return (
    <>
      <ambientLight
        intensity={performanceMode ? 0.3 : 0.2}
        color={new THREE.Color(0xffffff)}
      />
      {tilesLoaded && tilesRendererRef.current && (
        <>
          {/* Original shadow wrapper - can be kept for compatibility */}
          {!performanceMode && (
            <TilesShadowWrapper
              tilesGroup={tilesRendererRef.current.group}
              shadowOpacity={shadowOpacity}
            />
          )}

          {/* Enhanced white material with shadow overlays */}
          <WhiteTilesMaterial
            tilesGroup={tilesRendererRef.current.group}
            shadowOpacity={shadowOpacity}
            enabled={whiteSceneEnabled}
            brightness={buildingBrightness}
            roughness={performanceMode ? 0.7 : 0.85}
            shadowIntensity={shadowIntensity}
            groundLevelY={groundHeight}
            isDebug={false}
          />
        </>
      )}

      <OrbitControls
        ref={orbitControlsRef}
        enableDamping
        dampingFactor={0.1}
        screenSpacePanning={false}
        maxPolarAngle={Math.PI / 2}
        minDistance={100}
        maxDistance={performanceMode ? 5000 : 1000000}
      />

      {/* Multi-layer ground replacement - optimized for performance */}
      <MultiLayerGround
        baseColor="#ffffff"
        groundSize={performanceMode ? 8000 : 10000}
        basePosition={[0, groundHeight, 0]}
        shadowOpacity={shadowOpacity}
        baseOpacity={1.0}
        enableGrid={!performanceMode} // Disable grid in performance mode
        gridSize={1000}
        gridDivisions={performanceMode ? 10 : 20}
        layerCount={performanceMode ? 3 : 5}
      />

      {/* Add performance mode toggle if needed */}
      <WhiteSceneControls
        whiteSceneEnabled={whiteSceneEnabled}
        setWhiteSceneEnabled={setWhiteSceneEnabled}
        buildingBrightness={buildingBrightness}
        setBuildingBrightness={setBuildingBrightness}
        groundHeight={groundHeight}
        setGroundHeight={setGroundHeight}
        shadowIntensity={shadowIntensity}
        setShadowIntensity={setShadowIntensity}
        performanceMode={performanceMode}
        setPerformanceMode={setPerformanceMode}
      />
    </>
  );
}
