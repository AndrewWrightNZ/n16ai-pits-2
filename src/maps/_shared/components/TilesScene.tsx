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
import { CSM } from "../csm"; // or wherever your CSM code is
import { PRESET_LOCATIONS } from "../hooks/locationsData";

// Import the TilesShadowWrapper component
import TilesShadowWrapper from "./TilesShadowWrapper";

// Hooks
import useMapSettings from "../hooks/useMapSettings";

type ExtendedTilesRenderer = TilesRenderer & {
  loadProgress?: number;
  setLatLonToYUp?: (lat: number, lon: number) => void;
  getAttributions?: (arr: any[]) => void;
  rootTileSet?: any;
};

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function TilesScene() {
  //

  // Refs
  const tilesRendererRef = useRef<ExtendedTilesRenderer | null>(null);
  const processedUrls = useRef(new Map<string, string>());
  const currentSessionId = useRef<string>("");

  const orbitControlsRef = useRef<any>(null);

  //

  // Hooks
  const {
    data: {
      // View
      isOrbiting,
      timeOfDay: rawTimeOfDay,

      // Location
      currentLocation,
    },
    operations: {
      // Loading
      onSetIsLoading,
      onSetLoadingProgress,

      onSetError,
      onSetTileCount,

      // View
      onSetCopyrightInfo,
    },
  } = useMapSettings();

  //

  // R3F hooks
  const { scene, camera, gl: renderer } = useThree();
  const [tilesLoaded, setTilesLoaded] = useState(false);

  // Shadow opacity based on time of day
  const [shadowOpacity, setShadowOpacity] = useState(0.3);

  // Create CSM for large scale shadows
  const csmRef = useRef<CSM | null>(null);

  // Make sure renderer has shadow map enabled
  useEffect(() => {
    if (renderer) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
  }, [renderer]);

  // Create CSM system - recreate when timeOfDay changes
  useEffect(() => {
    // Clean up existing CSM if any
    if (csmRef.current) {
      csmRef.current.remove(); // Use the built-in remove method
      csmRef.current.dispose(); // And dispose to clean up shaders
      csmRef.current = null;
    }

    // Calculate initial light direction based on time of day
    const timeOfDay = new Date(rawTimeOfDay);

    const hours = timeOfDay.getHours() + timeOfDay.getMinutes() / 60;
    const sunriseHour = 6;
    const sunsetHour = 20; // TODO: THIS CAN BE DYNAMIC EACH DAY
    const dayLength = sunsetHour - sunriseHour;

    // Calculate sun angle based on time of day
    let sunAngle = 0;
    if (hours >= sunriseHour && hours <= sunsetHour) {
      sunAngle = ((hours - sunriseHour) / dayLength) * Math.PI;
    } else if (hours < sunriseHour) {
      sunAngle = -0.2; // Just before sunrise
    } else {
      sunAngle = Math.PI + 0.2; // Just after sunset
    }

    // Initial light direction based on sun angle
    const lightDirection = new THREE.Vector3(
      -Math.cos(sunAngle),
      -Math.max(0.1, Math.sin(sunAngle)),
      0.5
    ).normalize();

    // Create a new CSM instance with proper config
    const csm = new CSM({
      camera,
      parent: scene,
      cascades: 3,
      maxFar: 1000,
      mode: "practical",
      shadowMapSize: 2048,
      shadowBias: -0.0001,
      lightDirection: lightDirection,
      lightIntensity: 2.0, // Increased intensity
      lightNear: 1,
      lightFar: 1000,
      lightMargin: 100,
      fade: false,
    });

    csmRef.current = csm;

    // Share the first cascade light ref with parent component if needed
    if (csm.lights.length > 0) {
      // Enhance shadow properties
      csm.lights.forEach((light) => {
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 10;
        light.shadow.camera.far = 2000;
        light.shadow.bias = -0.0003;
        light.shadow.normalBias = 0.02;
        light.shadow.radius = 1;
      });
    }

    return () => {
      // Clean up cascade lights on unmount
      if (csmRef.current) {
        csmRef.current.remove();
        csmRef.current.dispose();
        csmRef.current = null;
      }
    };
  }, [scene, camera, rawTimeOfDay]); // Keep timeOfDay dependency to recreate CSM when time changes significantly

  // Initialize 3D Tiles
  useEffect(() => {
    onSetIsLoading(true);
    onSetError(null);
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

    tilesRenderer.errorTarget = 0.25;
    tilesRenderer.maxDepth = 50;
    tilesRenderer.lruCache.minSize = 1000;

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

    // Set up shadow casting for the tiles group - once when loaded, no recurring updates needed
    const setupShadowsForTiles = () => {
      // Track processed materials to avoid duplicates
      const processedMaterials = new Set();

      tilesRenderer.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Allow meshes to cast shadows only
          child.castShadow = true;
          child.receiveShadow = true; // Important: Don't make tiles receive shadows

          // NO material conversion needed - we'll keep the original materials
          if (child.material) {
            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];

            materials.forEach((material) => {
              // Skip already processed materials
              if (material.uuid && processedMaterials.has(material.uuid)) {
                return;
              }

              // Mark as processed
              if (material.uuid) {
                processedMaterials.add(material.uuid);
              }

              // Just make sure materials update properly
              material.needsUpdate = true;
            });
          }
        }
      });
    };

    // Error listener
    tilesRenderer.addEventListener("load-error", (ev: any) => {
      onSetError(`Tiles loading error: ${ev.error?.message || "Unknown"}`);
    });

    // Tiles loaded - this is when we set up the shadows
    tilesRenderer.addEventListener("load-tile-set", () => {
      setupShadowsForTiles();
      onSetTileCount(tilesRenderer.group.children.length);
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
        onSetLoadingProgress(prog);
      }
      if (tilesRenderer.rootTileSet !== null) {
        // The main tile set is loaded
        onSetIsLoading(false);
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
  }, [camera, renderer, scene, currentLocation]);

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

  // Time-of-day updates - use CSM's updateFrustums method to handle changes
  useEffect(() => {
    // Adjust shadow opacity based on time of day
    const timeOfDay = new Date(rawTimeOfDay);

    const hours = timeOfDay.getHours();
    if (hours < 6 || hours > 20) {
      setShadowOpacity(0.8); // Much stronger shadows at night
    } else if (hours < 8 || hours > 18) {
      setShadowOpacity(0.7); // Stronger shadows at dawn/dusk
    } else {
      setShadowOpacity(0.6); // Stronger shadows during day
    }

    // If CSM exists, update its frustums
    if (csmRef.current) {
      // Calculate sun angle based on time of day
      const hours = timeOfDay.getHours() + timeOfDay.getMinutes() / 60;
      const sunriseHour = 6;
      const sunsetHour = 20;
      const dayLength = sunsetHour - sunriseHour;

      let sunAngle = 0;
      if (hours >= sunriseHour && hours <= sunsetHour) {
        sunAngle = ((hours - sunriseHour) / dayLength) * Math.PI;
      } else if (hours < sunriseHour) {
        sunAngle = -0.2; // Just before sunrise
      } else {
        sunAngle = Math.PI + 0.2; // Just after sunset
      }

      // Update the light direction
      const lightDirection = new THREE.Vector3(
        -Math.cos(sunAngle),
        -Math.max(0.1, Math.sin(sunAngle)),
        0.5
      ).normalize();

      csmRef.current.lightDirection = lightDirection;

      // Force a full update of all CSM components
      csmRef.current.updateFrustums();
      csmRef.current.update();
    }
  }, [rawTimeOfDay]);

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

    // Update CSM after camera position changes
    if (csmRef.current) {
      // Now we can use the public updateFrustums method
      csmRef.current.updateFrustums();
      csmRef.current.update();
    }
  }

  // The render loop - use the public methods of the CSM class
  useFrame(({ clock }) => {
    if (tilesRendererRef.current) {
      tilesRendererRef.current.update();

      // Occasionally update tileCount
      if (Math.random() < 0.01) {
        // 1% chance each frame
        onSetTileCount(tilesRendererRef.current.group.children.length);
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
          onSetCopyrightInfo(cStr);
        }
      } catch {}
    }

    // Update sun position and shadows each frame
    if (csmRef.current) {
      // Calculate light position based on current time
      const timeOfDay = new Date(rawTimeOfDay);

      const hours = timeOfDay.getHours() + timeOfDay.getMinutes() / 60;
      const sunriseHour = 6;
      const sunsetHour = 20;
      const dayLength = sunsetHour - sunriseHour;

      // Calculate sun angle based on time of day
      let sunAngle = 0;
      if (hours >= sunriseHour && hours <= sunsetHour) {
        sunAngle = ((hours - sunriseHour) / dayLength) * Math.PI;
      } else if (hours < sunriseHour) {
        sunAngle = -0.2; // Just before sunrise
      } else {
        sunAngle = Math.PI + 0.2; // Just after sunset
      }

      // Apply a slight oscillation for smoother transitions
      const wobble = Math.sin(clock.getElapsedTime() * 0.1) * 0.001;

      // Create a new light direction based on sun angle
      // This is the key - we need to update the lightDirection property
      // which the CSM class uses in its update method
      const newLightDirection = new THREE.Vector3(
        -Math.cos(sunAngle + wobble),
        -Math.max(0.1, Math.sin(sunAngle + wobble)),
        0.5
      ).normalize();

      // Update the CSM light direction - this is a public property
      csmRef.current.lightDirection = newLightDirection;

      // Call update, which will reposition the lights based on the new direction
      csmRef.current.update();
    }
  });

  return (
    <>
      {/* Ambient light - reduced intensity for better shadow contrast */}
      <ambientLight intensity={0.2} color={new THREE.Color(0xffffff)} />

      {/* Add our shadow wrapper to make tiles receive shadows */}
      {tilesLoaded && tilesRendererRef.current && (
        <TilesShadowWrapper
          tilesGroup={tilesRendererRef.current.group}
          shadowOpacity={shadowOpacity}
        />
      )}

      {/* Controls (orbit, panning, etc.) */}
      <OrbitControls
        ref={orbitControlsRef}
        enableDamping
        dampingFactor={0.1}
        screenSpacePanning={false}
        maxPolarAngle={Math.PI / 2}
        minDistance={100}
        maxDistance={500}
      />

      {/* Shadow-receiving ground plane at a specific height */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 60, 0]}>
        <planeGeometry args={[500, 500]} />
        <shadowMaterial transparent opacity={0.8} color={0x000000} />
      </mesh>
    </>
  );
}
