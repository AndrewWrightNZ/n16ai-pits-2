import { useRef, useEffect, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";

// 3D Tiles modules
import { TilesRenderer } from "3d-tiles-renderer";
import {
  GLTFExtensionsPlugin,
  TileCompressionPlugin,
  TilesFadePlugin,
} from "3d-tiles-renderer/plugins";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// If using Cascade Shadow Maps (CSM):
import { CSM } from "../csm"; // or wherever your CSM code is
import { PRESET_LOCATIONS } from "../hooks/locationsData";

// Import our shadow solution
import ShadowGroundPlane from "./ShadowGroundPlane";

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

  // One fallback directional light & an ambient light
  const fallbackLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);

  // R3F hooks
  const { scene, camera, gl: renderer } = useThree();
  const [sunLightOpacity, setSunLightOpacity] = useState(0.6);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  // Create CSM for large scale shadows
  const csmRef = useRef<CSM | null>(null);
  useEffect(() => {
    const csm = new CSM({
      camera,
      parent: scene,
      cascades: 3,
      maxFar: 10000,
      mode: "practical",
      shadowMapSize: 2048,
      shadowBias: -0.0001,
      lightDirection: new THREE.Vector3(1, -1, 1).normalize(),
      lightIntensity: 1,
      lightNear: 1,
      lightFar: 10000,
      lightMargin: 500,
      fade: false,
    });
    csmRef.current = csm;

    // Optionally expose the first cascade light if you want a reference
    if (csm.lights.length > 0) {
      setLightRef(csm.lights[0] as any);
    }

    return () => {
      // Clean up cascade lights
      csm.lights.forEach((light) => {
        scene.remove(light);
        scene.remove(light.target);
      });
    };
  }, [scene, camera, setLightRef]);

  // Initialize 3D Tiles
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setTilesLoaded(false);

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

    tilesRenderer.errorTarget = 0.5;
    tilesRenderer.maxDepth = 50;
    tilesRenderer.lruCache.minSize = 2000;

    // Add your API key + session if missing
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

    // Error listener
    tilesRenderer.addEventListener("load-error", (ev: any) => {
      setError(`Tiles loading error: ${ev.error?.message || "Unknown"}`);
    });

    // Tiles loaded
    tilesRenderer.addEventListener("load-tile-set", () => {
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
        // The main tile set is loaded
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
      // Cleanup on unmount
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

  // If location changes, reposition camera
  useEffect(() => {
    if (tilesRendererRef.current) {
      positionCameraAtLocation(currentLocation);
    }
  }, [currentLocation]);

  // isOrbiting -> autorotate the camera
  useEffect(() => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.autoRotate = isOrbiting;
      orbitControlsRef.current.autoRotateSpeed = 2.0;
    }
  }, [isOrbiting]);

  // Time-of-day => tweak fallback light, ambient intensity, etc.
  useEffect(() => {
    updateSunPosition();
    const hours = timeOfDay.getHours();
    if (hours < 6 || hours > 20) {
      setSunLightOpacity(0.8);
    } else if (hours < 8 || hours > 18) {
      setSunLightOpacity(0.6);
    } else {
      setSunLightOpacity(0.4);
    }
  }, [timeOfDay]);

  function updateSunPosition() {
    if (!fallbackLightRef.current || !ambientLightRef.current) return;

    const hours = timeOfDay.getHours() + timeOfDay.getMinutes() / 60;
    const sunriseHour = 6;
    const sunsetHour = 20;
    const dayLength = sunsetHour - sunriseHour;

    // Basic day/night angle
    let sunAngle = 0;
    if (hours >= sunriseHour && hours <= sunsetHour) {
      sunAngle = ((hours - sunriseHour) / dayLength) * Math.PI;
    } else if (hours < sunriseHour) {
      sunAngle = -0.2;
    } else {
      sunAngle = Math.PI + 0.2;
    }

    // Position the fallback directional light in a big circle
    const radius = 5000;
    const sunX = Math.cos(sunAngle) * radius;
    const sunY = Math.sin(sunAngle) * radius;
    fallbackLightRef.current.position.set(sunX, Math.max(10, sunY), 0);

    // Increase intensity if the sun is above the horizon
    let intensity = 0.1;
    if (sunY > 0) {
      intensity = 1.0 + (sunY / radius) * 2.0;
    }
    fallbackLightRef.current.intensity = intensity;
    fallbackLightRef.current.castShadow = sunY > 0;

    // Important: Adjust shadow camera for better coverage
    fallbackLightRef.current.shadow.mapSize.width = 4096;
    fallbackLightRef.current.shadow.mapSize.height = 4096;
    fallbackLightRef.current.shadow.camera.near = 10;
    fallbackLightRef.current.shadow.camera.far = 10000;
    fallbackLightRef.current.shadow.camera.left = -2000;
    fallbackLightRef.current.shadow.camera.right = 2000;
    fallbackLightRef.current.shadow.camera.top = 2000;
    fallbackLightRef.current.shadow.camera.bottom = -2000;
    fallbackLightRef.current.shadow.bias = -0.0005;
    fallbackLightRef.current.shadow.normalBias = 0.04;

    // Adjust ambient
    ambientLightRef.current.intensity = sunY > 0 ? 0.1 : 0.02;
  }

  function positionCameraAtLocation(locKey: string) {
    if (!camera || !tilesRendererRef.current || !orbitControlsRef.current)
      return;
    const loc = PRESET_LOCATIONS[locKey];
    if (!loc) return;

    // Align tile set so lat/lon is Y-up in the local scene
    if (tilesRendererRef.current.setLatLonToYUp) {
      tilesRendererRef.current.setLatLonToYUp(
        loc.lat * THREE.MathUtils.DEG2RAD,
        loc.lng * THREE.MathUtils.DEG2RAD
      );
    }

    // Position camera relative to the origin
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

    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.set(0, 0, 0);
      orbitControlsRef.current.minDistance = 50;
      orbitControlsRef.current.maxDistance = 1000;
      orbitControlsRef.current.update();
    }

    if (tilesRendererRef.current) {
      tilesRendererRef.current.errorTarget = 2;
      tilesRendererRef.current.update();
    }
    updateSunPosition();
  }

  // The render loop
  useFrame(() => {
    if (tilesRendererRef.current) {
      tilesRendererRef.current.update();

      // Occasionally update tileCount
      if (Math.random() < 0.01) {
        // 1% chance each frame
        setTileCount(tilesRendererRef.current.group.children.length);
      }

      // If you want to gather attributions
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

    // Update cascade shadow maps
    if (csmRef.current) {
      csmRef.current.update();
    }
  });

  return (
    <>
      {/* Ambient light */}
      <ambientLight
        ref={ambientLightRef}
        intensity={0.02}
        color={new THREE.Color(0x111122)}
      />

      {/* Main directional light (sun) */}
      <directionalLight
        ref={fallbackLightRef}
        position={[1000, 1000, 1000]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-2000}
        shadow-camera-right={2000}
        shadow-camera-top={2000}
        shadow-camera-bottom={-2000}
        shadow-camera-near={10}
        shadow-camera-far={10000}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
        color={0xffffff}
      />

      {/* Controls (orbit, panning, etc.) */}
      <OrbitControls
        ref={orbitControlsRef}
        enableDamping
        dampingFactor={0.1}
        screenSpacePanning={false}
        maxPolarAngle={Math.PI / 2}
        minDistance={100}
        maxDistance={1000000}
      />

      {/* Add shadow receivers when tiles are loaded */}
      {tilesLoaded && <ShadowGroundPlane />}

      {/* Add some debug objects that will cast shadows */}
      <mesh position={[0, 50, 0]} castShadow>
        <boxGeometry args={[20, 20, 20]} />
        <meshStandardMaterial color="red" />
      </mesh>

      <mesh position={[40, 60, 40]} castShadow>
        <sphereGeometry args={[15, 32, 32]} />
        <meshStandardMaterial color="green" />
      </mesh>
    </>
  );
}
