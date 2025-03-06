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

// Define extended interface for TilesRenderer to handle missing TypeScript definitions
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
  // Add missing method
  setLatLonToYUp: (lat: number, lon: number) => void;
}

// API key from environment variables
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Container styles
const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "600px",
  position: "relative",
  overflow: "hidden",
};

// Copyright info style
const attributionStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "5px",
  right: "5px",
  fontSize: "10px",
  color: "#fff",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  padding: "2px 4px",
  borderRadius: "2px",
  zIndex: 10,
};

// Control panel styles
const controlPanelStyle: React.CSSProperties = {
  position: "absolute",
  top: "10px",
  left: "10px",
  backgroundColor: "rgba(255, 255, 255, 0.8)",
  padding: "10px",
  borderRadius: "4px",
  zIndex: 10,
  maxWidth: "200px",
};

// Google logo style
const googleLogoStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "5px",
  left: "5px",
  zIndex: 10,
};

// Button style
const buttonStyle = {
  padding: "8px 12px",
  backgroundColor: "#fff",
  border: "1px solid #ccc",
  borderRadius: "4px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
  cursor: "pointer",
  margin: "5px 0",
  width: "100%",
};

// Define locations
const locations = {
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

// Main TilesScene component that handles the 3D content
const TilesScene = ({
  currentLocation,
  isOrbiting,
  setTileCount,
  setCopyrightInfo,
  setIsLoading,
  setError,
  setLoadingProgress,
}: any) => {
  const tilesRendererRef = useRef<ExtendedTilesRenderer | null>(null);
  const processedUrls = useRef(new Map());
  const currentSessionId = useRef("");
  const orbitIntervalRef = useRef(null);
  const debugRef = useRef({});

  // Get Three.js objects from R3F
  const { scene, camera, gl: renderer } = useThree();

  // Reference to orbit controls for manual update
  const controlsRef = useRef(null);

  // Initialize tiles renderer
  useEffect(() => {
    console.log("Initializing tiles renderer");

    try {
      setIsLoading(true);
      setError(null);

      // Add axes helper for debugging
      const axesHelper = new THREE.AxesHelper(10000);
      scene.add(axesHelper);

      // Load the Google 3D Tiles
      const rootUrl = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${API_KEY}`;
      console.log("Initializing tiles renderer with URL:", rootUrl);
      console.log("API Key (first 5 chars):", API_KEY.substring(0, 5) + "...");

      // Create tiles renderer
      const tilesRenderer = new TilesRenderer(rootUrl);

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

      // Modified preprocessURL function with logging
      tilesRenderer.preprocessURL = (url) => {
        const urlString = url.toString();

        if (urlString.startsWith("blob:")) {
          return urlString;
        }

        if (processedUrls.current.has(urlString)) {
          return processedUrls.current.get(urlString);
        }

        const sessionMatch = urlString.match(/[?&]session=([^&]+)/);
        if (sessionMatch && sessionMatch[1]) {
          currentSessionId.current = sessionMatch[1];
          console.log("Found session ID:", currentSessionId.current);
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

        // Log URL processing (but hide the API key from logs)
        const logUrl = processedUrl.replace(API_KEY, "API_KEY");
        console.log(`Processed URL: ${urlString} → ${logUrl}`);

        processedUrls.current.set(urlString, processedUrl);
        return processedUrl;
      };

      // Add event listener for errors
      tilesRenderer.addEventListener("load-error", (event: any) => {
        console.error("Tiles error:", event.error);
        setError(
          `Tiles loading error: ${event.error.message || "Unknown error"}`
        );
      });

      // Add event listener for tile set loading
      tilesRenderer.addEventListener("load-tile-set", (event) => {
        console.log("TileSet loaded:", event.tileSet);
        const numTiles = tilesRenderer.group.children.length;
        console.log("Number of tiles in group:", numTiles);
        setTileCount(numTiles);

        // If tiles are loaded, check visibility
        setTimeout(() => {
          checkVisibility();
          debugSceneState();
        }, 1000);
      });

      tilesRenderer.setCamera(camera);
      tilesRenderer.setResolutionFromRenderer(camera, renderer);

      // Make sure the tiles group is visible
      tilesRenderer.group.visible = true;

      // Add the tiles group to the scene
      scene.add(tilesRenderer.group);
      // @ts-ignore
      tilesRendererRef.current = tilesRenderer;

      // Monitor tile loading progress
      const checkLoadProgress = () => {
        if (tilesRenderer.loadProgress !== undefined) {
          const progress = Math.round(tilesRenderer.loadProgress * 100);
          setLoadingProgress(progress);
          console.log(`Loading progress: ${progress}%`);
        }

        if (tilesRenderer.rootTileSet !== null) {
          console.log("Tileset loaded:", tilesRenderer.rootTileSet);
          setIsLoading(false);

          // After loading, check if tiles are visible
          setTimeout(() => {
            checkVisibility();
            debugSceneState();
          }, 2000);
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

        scene.remove(axesHelper);
      };
    } catch (err: any) {
      console.error("Error initializing 3D tiles renderer:", err);
      setError("Failed to initialize 3D renderer: " + err.message);
      setIsLoading(false);
    }
  }, []);

  // Effect for handling location changes
  useEffect(() => {
    if (tilesRendererRef.current) {
      positionCameraAtLocation(currentLocation);
    }
  }, [currentLocation]);

  // Effect for handling orbiting
  useEffect(() => {
    if (orbitIntervalRef.current !== null) {
      window.clearInterval(orbitIntervalRef.current);
      orbitIntervalRef.current = null;
    }

    if (isOrbiting && controlsRef.current) {
      // @ts-ignore
      controlsRef.current.autoRotate = true;
      // @ts-ignore
      controlsRef.current.autoRotateSpeed = 2.0;
    } else if (controlsRef.current) {
      // @ts-ignore
      controlsRef.current.autoRotate = false;
    }

    return () => {
      if (orbitIntervalRef.current !== null) {
        window.clearInterval(orbitIntervalRef.current);
        orbitIntervalRef.current = null;
      }
      if (controlsRef.current) {
        // @ts-ignore
        controlsRef.current.autoRotate = false;
      }
    };
  }, [isOrbiting]);

  // Enhanced check for tile visibility with logging
  const checkVisibility = () => {
    if (tilesRendererRef.current && tilesRendererRef.current.group) {
      // Check if any tiles are loaded
      if (tilesRendererRef.current.group.children.length === 0) {
        console.log("No tiles loaded yet");
        return;
      }

      console.log(
        "Tiles group has children:",
        tilesRendererRef.current.group.children.length
      );
      setTileCount(tilesRendererRef.current.group.children.length);

      // Explicitly set group visibility
      tilesRendererRef.current.group.visible = true;

      // Make sure all tiles are visible by traversing the entire tree
      tilesRendererRef.current.group.traverse((child) => {
        if (!child.visible) {
          console.log("Found invisible child, making visible:", child);
          child.visible = true;
        }
      });

      // Log the tile bounding box
      const box = new THREE.Box3().setFromObject(
        tilesRendererRef.current.group
      );

      const boxInfo = {
        min: box.min.toArray(),
        max: box.max.toArray(),
        size: box.getSize(new THREE.Vector3()).toArray(),
      };

      console.log("Tile bounding box:", boxInfo);
      // @ts-ignore
      debugRef.current.boundingBox = boxInfo;

      // Check if the box is valid
      if (box.isEmpty() || box.getSize(new THREE.Vector3()).length() === 0) {
        console.warn("Bounding box is empty or has zero size");
      }
    }
  };

  // Enhanced debug function with detailed information
  const debugSceneState = () => {
    if (!camera || !tilesRendererRef.current) return;

    const cameraPos = camera.position.toArray();
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    const cameraDirArray = cameraDir.toArray();

    console.log("Camera position:", cameraPos);
    console.log("Camera lookAt:", cameraDirArray);

    // @ts-ignore
    debugRef.current.camera = {
      position: cameraPos,
      direction: cameraDirArray,
    };

    // Check the bounding box of all tiles
    if (
      tilesRendererRef.current.group &&
      tilesRendererRef.current.group.children.length > 0
    ) {
      const box = new THREE.Box3().setFromObject(
        tilesRendererRef.current.group
      );
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      const boxInfo = {
        min: box.min.toArray(),
        max: box.max.toArray(),
        size: size.toArray(),
        center: center.toArray(),
      };

      console.log("Tiles bounding box:", boxInfo);

      // Calculate distance between camera and center of tiles
      const distance = camera.position.distanceTo(center);
      console.log("Distance to tile center:", distance);

      // Check if the tiles group is in the camera frustum
      const frustum = new THREE.Frustum();
      const matrix = new THREE.Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      );
      frustum.setFromProjectionMatrix(matrix);

      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);

      const inFrustum = frustum.intersectsSphere(sphere);
      console.log("Tiles in frustum:", inFrustum);

      // @ts-ignore
      debugRef.current.tiles = {
        boundingBox: boxInfo,
        distance,
        inFrustum,
      };

      // If not in frustum, try to adjust camera to see tiles
      if (!inFrustum) {
        console.warn(
          "Tiles not in camera frustum - may need to adjust camera position"
        );
      }
    } else {
      console.log("No tiles to analyze");
    }

    // Log tile stats if available
    if (tilesRendererRef.current.stats) {
      console.log("Tiles stats:", tilesRendererRef.current.stats);
      // @ts-ignore
      debugRef.current.stats = { ...tilesRendererRef.current.stats };
    }
  };

  // Enhanced positioning for camera and tiles
  const positionCameraAtLocation = (locationKey: any) => {
    if (!camera || !tilesRendererRef.current || !controlsRef.current) return;

    // @ts-ignore
    const location = locations[locationKey];

    console.log(`Positioning at ${locationKey}:`, location);

    // Use setLatLonToYUp to transform coordinates
    if (tilesRendererRef.current.setLatLonToYUp) {
      tilesRendererRef.current.setLatLonToYUp(
        location.lat * THREE.MathUtils.DEG2RAD,
        location.lng * THREE.MathUtils.DEG2RAD
      );

      console.log(
        "Group position after setLatLonToYUp:",
        tilesRendererRef.current.group.position.toArray()
      );
    }

    // IMPORTANT: Set camera to a higher altitude to ensure visibility
    const viewingAltitude = Math.max(location.altitude, 2000); // Higher minimum altitude

    // Position camera looking down at an angle (not directly overhead)
    camera.position.set(
      Math.sin(location.heading * THREE.MathUtils.DEG2RAD) * viewingAltitude,
      viewingAltitude,
      Math.cos(location.heading * THREE.MathUtils.DEG2RAD) * viewingAltitude
    );

    // Look at the center (origin)
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 1, 0);

    console.log("Camera positioned at:", camera.position.toArray());

    // Ensure camera frustum is appropriate for viewing
    camera.near = 1;
    camera.far = 100000000; // Very large far plane
    camera.updateProjectionMatrix();

    // Reset OrbitControls target
    if (controlsRef.current) {
      // @ts-ignore
      controlsRef.current.target.set(0, 0, 0);
      // @ts-ignore
      controlsRef.current.minDistance = 100; // Allow closer zoom
      // @ts-ignore
      controlsRef.current.maxDistance = 1000000; // Allow farther zoom out
      // @ts-ignore
      controlsRef.current.update();
    }

    // Force an update of the tiles renderer
    if (tilesRendererRef.current) {
      tilesRendererRef.current.update();

      // Check visibility and debug after a short delay
      setTimeout(() => {
        checkVisibility();
        debugSceneState();

        // Reset tiles if needed
        if (
          tilesRendererRef.current &&
          tilesRendererRef.current.group.children.length === 0
        ) {
          console.log("No tiles loaded yet, trying to reset view");
          tilesRendererRef.current.resetFailedTiles();

          // Force another update
          tilesRendererRef.current.update();
        }
      }, 2000);
    }
  };

  // Function to extract copyright info from tiles
  const extractCopyrightInfo = () => {
    if (!tilesRendererRef.current) return;

    try {
      // @ts-ignore
      const attributions = [];
      // @ts-ignore
      tilesRendererRef.current.getAttributions(attributions);
      const copyrightSet = new Set();
      // @ts-ignore
      attributions.forEach((attribution) => {
        if (
          attribution &&
          attribution.value &&
          typeof attribution.value === "string"
        ) {
          const copyrights = attribution.value.split(";");
          copyrights.forEach((copyright: any) => {
            copyrightSet.add(copyright.trim());
          });
        }
      });
      const combinedCopyright = Array.from(copyrightSet).join("; ");
      setCopyrightInfo(combinedCopyright);
    } catch (error) {
      console.warn("Could not extract copyright information:", error);
    }
  };

  // Animation frame with React Three Fiber's useFrame
  useFrame(() => {
    if (tilesRendererRef.current) {
      tilesRendererRef.current.update();

      // Update tile count and debug info occasionally
      if (Math.random() < 0.01) {
        // Approximately once per second
        const newTileCount = tilesRendererRef.current.group.children.length;
        setTileCount(newTileCount);

        // Check if tiles are visible in the scene
        if (
          tilesRendererRef.current.group &&
          tilesRendererRef.current.group.children.length > 0 &&
          tilesRendererRef.current.stats
        ) {
          // Log stats occasionally
          console.log("Tiles stats:", {
            visible: tilesRendererRef.current.stats.visible,
            active: tilesRendererRef.current.stats.active,
            loading: tilesRendererRef.current.stats.loading,
            pending: tilesRendererRef.current.stats.pending,
          });
        }
      }

      extractCopyrightInfo();
    }
  });

  // Reset view function
  const resetView = () => {
    if (!tilesRendererRef.current || !camera || !controlsRef.current) return;

    console.log("Resetting view...");

    // Reset camera to a higher position looking down
    camera.position.set(0, 50000, 0);
    camera.lookAt(0, 0, 0);
    camera.near = 1;
    camera.far = 10000000;
    camera.updateProjectionMatrix();

    // Reset controls
    if (controlsRef.current) {
      // @ts-ignore
      controlsRef.current.target.set(0, 0, 0);
      // @ts-ignore
      controlsRef.current.minDistance = 100;
      // @ts-ignore
      controlsRef.current.maxDistance = 500000;
      // @ts-ignore
      controlsRef.current.update();
    }

    // Reset any failed tiles
    tilesRendererRef.current.resetFailedTiles();

    // Force update
    tilesRendererRef.current.update();

    // Check visibility after a short delay
    setTimeout(() => {
      checkVisibility();
      debugSceneState();
    }, 2000);
  };

  return (
    <>
      {/* Scene lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[1, 1, 1]} intensity={1} castShadow />

      {/* Orbit controls */}
      <OrbitControls
        ref={controlsRef}
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

// Using React Three Fiber's Html component for UI overlays
// @ts-ignore
const Html = ({ children, position }) => {
  // const { camera } = useThree();
  // const vec = new THREE.Vector3(...position);

  return (
    <div
      style={{
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          transform: "translate(-50%, -50%)",
          pointerEvents: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Main component
const PhotorealisticTilesMap = () => {
  const [currentLocation, setCurrentLocation] = useState("sanFrancisco");
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [copyrightInfo, setCopyrightInfo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [tileCount, setTileCount] = useState(0);
  const [debug, setDebug] = useState({});

  // Function to change location
  const changeLocation = (locationKey: any) => {
    setCurrentLocation(locationKey);
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={containerStyle}>
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
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              color: "white",
              zIndex: 100,
            }}
          >
            <div>Loading 3D Tiles... {loadingProgress}%</div>
            <div
              style={{
                width: "200px",
                height: "10px",
                backgroundColor: "#333",
                marginTop: "10px",
                borderRadius: "5px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${loadingProgress}%`,
                  height: "100%",
                  backgroundColor: "#4CAF50",
                }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "white",
              padding: "20px",
              textAlign: "center",
              zIndex: 100,
            }}
          >
            <div>
              <h3>Error</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Tile count indicator */}
        {!isLoading && (
          <div
            style={{
              position: "absolute",
              bottom: "30px",
              left: "50%",
              transform: "translateX(-50%)",
              color: "white",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              padding: "5px 10px",
              borderRadius: "4px",
              fontSize: "12px",
              zIndex: 10,
            }}
          >
            {tileCount > 0
              ? `Tiles loaded: ${tileCount}`
              : "No tiles visible - try resetting view"}
          </div>
        )}

        {/* Controls panel */}
        <div style={controlPanelStyle}>
          <h3 style={{ margin: "0 0 10px 0" }}>3D Controls</h3>
          {/* Location selection */}
          <div style={{ marginBottom: "10px" }}>
            <p style={{ margin: "5px 0", fontWeight: "bold" }}>
              Change Location:
            </p>
            {Object.entries(locations).map(([key, loc]) => (
              <button
                key={key}
                onClick={() => changeLocation(key)}
                style={{
                  ...buttonStyle,
                  backgroundColor: currentLocation === key ? "#4CAF50" : "#fff",
                  color: currentLocation === key ? "white" : "black",
                }}
              >
                {loc.description}
              </button>
            ))}
          </div>

          {/* Orbit controls */}
          <div style={{ marginBottom: "10px" }}>
            <p style={{ margin: "5px 0", fontWeight: "bold" }}>
              Camera Controls:
            </p>
            <button
              onClick={() => setIsOrbiting(!isOrbiting)}
              style={{
                ...buttonStyle,
                backgroundColor: isOrbiting ? "#f0ad4e" : "#fff",
                color: isOrbiting ? "white" : "black",
              }}
            >
              {isOrbiting ? "Stop Orbit" : "Start Orbit"}
            </button>
          </div>
        </div>

        {/* Google logo attribution */}
        <div style={googleLogoStyle}>
          <img
            src="https://www.gstatic.com/images/branding/googlelogo/1x/googlelogo_color_68x28dp.png"
            alt="Google"
            height="20"
          />
        </div>

        {/* Copyright information */}
        {copyrightInfo && <div style={attributionStyle}>{copyrightInfo}</div>}
      </div>
    </div>
  );
};

export default PhotorealisticTilesMap;
