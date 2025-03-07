import { useRef, useState, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { TilesRenderer } from "3d-tiles-renderer";
import {
  GLTFExtensionsPlugin,
  TileCompressionPlugin,
  TilesFadePlugin,
} from "3d-tiles-renderer/plugins";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { cn } from "../utils";

interface TilesRendererExtendedEventMap {
  "load-error": { error: Error };
  "load-tile-set": { tileSet: object; url: string };
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

// Location type definition
interface Location {
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  description: string;
}

// Define locations
const locations: Record<string, Location> = {
  sanFrancisco: {
    lat: 37.7749,
    lng: -122.4194,
    altitude: 500,
    heading: 0,
    description: "San Francisco",
  },
  newYork: {
    lat: 40.7128,
    lng: -74.006,
    altitude: 500,
    heading: 45,
    description: "New York",
  },
  paris: {
    lat: 48.8566,
    lng: 2.3522,
    altitude: 500,
    heading: 30,
    description: "Paris",
  },
  tokyo: {
    lat: 35.6762,
    lng: 139.6503,
    altitude: 500,
    heading: 0,
    description: "Tokyo",
  },
};

// Interface for TilesScene props
interface TilesSceneProps {
  currentLocation: string;
  isOrbiting: boolean;
  setTileCount: (count: number) => void;
  setCopyrightInfo: (info: string) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLoadingProgress: (progress: number) => void;
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

// Main TilesScene component that handles the 3D content
const TilesScene = ({
  currentLocation,
  isOrbiting,
  setTileCount,
  setCopyrightInfo,
  setIsLoading,
  setError,
  setLoadingProgress,
}: TilesSceneProps) => {
  const tilesRendererRef = useRef<ExtendedTilesRenderer | null>(null);
  const processedUrls = useRef(new Map<string, string>());
  const currentSessionId = useRef<string>("");
  const orbitIntervalRef = useRef<number | null>(null);

  // Get Three.js objects from R3F
  const { scene, camera, gl: renderer } = useThree();

  // Reference to orbit controls for manual update
  const controlsRef = useRef<OrbitControlsRef | null>(null);

  // Initialize tiles renderer
  useEffect(() => {
    try {
      setIsLoading(true);
      setError(null);

      // Load the Google 3D Tiles
      const rootUrl = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${API_KEY}`;

      // Create tiles renderer
      const tilesRenderer = new TilesRenderer(rootUrl) as ExtendedTilesRenderer;

      // Add plugin configuration
      tilesRenderer.registerPlugin(new TileCompressionPlugin());
      tilesRenderer.registerPlugin(new TilesFadePlugin());
      tilesRenderer.registerPlugin(
        new GLTFExtensionsPlugin({
          dracoLoader: new DRACOLoader().setDecoderPath(
            "https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/"
          ),
        })
      );

      // Improve renderer configuration for better visibility
      tilesRenderer.errorTarget = 24;
      tilesRenderer.maxDepth = 20;
      tilesRenderer.displayActiveTiles = true;

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

  // Enhanced positioning for camera and tiles
  const positionCameraAtLocation = (locationKey: string) => {
    if (!camera || !tilesRendererRef.current || !controlsRef.current) return;

    const location = locations[locationKey];
    if (!location) return;

    // Use setLatLonToYUp to transform coordinates
    if (tilesRendererRef.current.setLatLonToYUp) {
      tilesRendererRef.current.setLatLonToYUp(
        location.lat * THREE.MathUtils.DEG2RAD,
        location.lng * THREE.MathUtils.DEG2RAD
      );
    }

    // Set camera to a higher altitude to ensure visibility
    const viewingAltitude = Math.max(location.altitude, 2000);

    // Position camera looking down at an angle (not directly overhead)
    camera.position.set(
      Math.sin(location.heading * THREE.MathUtils.DEG2RAD) * viewingAltitude,
      viewingAltitude,
      Math.cos(location.heading * THREE.MathUtils.DEG2RAD) * viewingAltitude
    );

    // Look at the center (origin)
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 1, 0);

    // Ensure camera frustum is appropriate for viewing
    camera.near = 1;
    camera.far = 100000000;
    camera.updateProjectionMatrix();

    // Reset OrbitControls target
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.minDistance = 100;
      controlsRef.current.maxDistance = 1000000;
      controlsRef.current.update();
    }

    // Force an update of the tiles renderer
    if (tilesRendererRef.current) {
      tilesRendererRef.current.update();

      // Reset tiles if needed
      setTimeout(() => {
        if (
          tilesRendererRef.current &&
          tilesRendererRef.current.group.children.length === 0
        ) {
          tilesRendererRef.current.resetFailedTiles();
          tilesRendererRef.current.update();
        }
      }, 2000);
    }
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

  return (
    <>
      {/* Scene lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[1, 1, 1]} intensity={1} castShadow />

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

// Main component interface
interface PhotorealisticTilesMapProps {
  // Add any props if needed
}

// Main component
const PhotorealisticTilesMap: React.FC<PhotorealisticTilesMapProps> = () => {
  const [currentLocation, setCurrentLocation] =
    useState<string>("sanFrancisco");
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const [copyrightInfo, setCopyrightInfo] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [tileCount, setTileCount] = useState<number>(0);

  // Function to change location
  const changeLocation = (locationKey: string) => {
    setCurrentLocation(locationKey);
  };

  return (
    <div className="relative">
      <div className="w-full h-[800px] relative overflow-hidden">
        <Canvas
          shadows
          camera={{
            fov: 45,
            near: 1,
            far: 100000000,
            position: [0, 5000, 0],
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x87ceeb);
            gl.setPixelRatio(window.devicePixelRatio);
            gl.shadowMap.enabled = true;
          }}
        >
          <TilesScene
            currentLocation={currentLocation}
            isOrbiting={isOrbiting}
            setTileCount={setTileCount}
            setCopyrightInfo={setCopyrightInfo}
            setIsLoading={setIsLoading}
            setError={setError}
            setLoadingProgress={setLoadingProgress}
          />
        </Canvas>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex flex-col justify-center items-center text-white z-50">
            <div>Loading 3D Tiles... {loadingProgress}%</div>
            <div className="w-52 h-2.5 bg-gray-700 mt-2.5 rounded-md overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute inset-0 bg-black/70 flex justify-center items-center text-white p-5 text-center z-50">
            <div>
              <h3 className="text-xl font-bold mb-2">Error</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Tile count indicator */}
        {!isLoading && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white bg-black/50 py-1 px-2.5 rounded text-xs z-10">
            {tileCount > 0
              ? `Tiles loaded: ${tileCount}`
              : "No tiles visible - try resetting view"}
          </div>
        )}

        {/* Controls panel */}
        <div className="absolute top-2.5 left-2.5 bg-white/80 p-2.5 rounded z-10 max-w-[200px]">
          <h3 className="font-bold text-gray-800 mb-2.5">3D Controls</h3>

          {/* Location selection */}
          <div className="mb-2.5">
            <p className="font-medium text-sm mb-1">Change Location:</p>

            {Object.entries(locations).map(([key, loc]) => (
              <LocationButton
                key={key}
                locationKey={key}
                location={loc}
                isActive={currentLocation === key}
                onClick={() => changeLocation(key)}
              />
            ))}
          </div>

          {/* Orbit controls */}
          <div className="mb-2.5">
            <p className="font-medium text-sm mb-1">Camera Controls:</p>
            <button
              onClick={() => setIsOrbiting(!isOrbiting)}
              className={cn(
                "w-full py-2 px-3 mb-1 text-sm font-medium border rounded shadow-sm transition-colors",
                isOrbiting
                  ? "bg-yellow-500 text-white border-yellow-600"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
              )}
            >
              {isOrbiting ? "Stop Orbit" : "Start Orbit"}
            </button>
          </div>
        </div>

        {/* Google logo attribution */}
        <div className="absolute bottom-1 left-1 z-10">
          <img
            src="https://www.gstatic.com/images/branding/googlelogo/1x/googlelogo_color_68x28dp.png"
            alt="Google"
            height="20"
            className="h-5"
          />
        </div>

        {/* Copyright information */}
        {copyrightInfo && (
          <div className="absolute bottom-1 right-1 text-[10px] text-white bg-black/50 py-0.5 px-1 rounded-sm z-10">
            {copyrightInfo}
          </div>
        )}
      </div>
    </div>
  );
};

// Location Button component
const LocationButton = ({
  locationKey,
  location,
  isActive,
  onClick,
}: {
  locationKey: string;
  location: Location;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    key={locationKey}
    onClick={onClick}
    className={cn(
      "w-full py-2 px-3 mb-1 text-sm font-medium border rounded shadow-sm transition-colors",
      isActive
        ? "bg-green-500 text-white border-green-600"
        : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
    )}
  >
    {location.description}
  </button>
);

export default PhotorealisticTilesMap;
