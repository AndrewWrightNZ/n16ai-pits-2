import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
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

const PhotorealisticTilesMap = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const tilesRendererRef = useRef<ExtendedTilesRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [copyrightInfo, setCopyrightInfo] = useState("");
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const orbitIntervalRef = useRef<number | null>(null);
  const [tileCount, setTileCount] = useState(0);
  const [debug, setDebug] = useState<any>({});

  // Define location type
  type Location = {
    lat: number;
    lng: number;
    altitude: number;
    heading: number;
    description: string;
  };

  // Define locations map type with string keys
  type LocationsMap = {
    [key: string]: Location;
  };

  // Predefine some interesting 3D locations
  const locations: LocationsMap = {
    sanFrancisco: {
      lat: 37.7749,
      lng: -122.4194,
      altitude: 500, // Increased altitude
      heading: 0,
      description: "San Francisco",
    },
    newYork: {
      lat: 40.7128,
      lng: -74.006,
      altitude: 500, // Increased altitude
      heading: 45,
      description: "New York",
    },
    paris: {
      lat: 48.8566,
      lng: 2.3522,
      altitude: 500, // Increased altitude
      heading: 30,
      description: "Paris",
    },
    tokyo: {
      lat: 35.6762,
      lng: 139.6503,
      altitude: 500, // Increased altitude
      heading: 0,
      description: "Tokyo",
    },
  };

  // Current location state
  const [currentLocation, setCurrentLocation] = useState("sanFrancisco");

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
      tilesRendererRef.current.group.traverse((child: THREE.Object3D) => {
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
      setDebug((prev: any) => ({ ...prev, boundingBox: boxInfo }));

      // Check if the box is valid
      if (box.isEmpty() || box.getSize(new THREE.Vector3()).length() === 0) {
        console.warn("Bounding box is empty or has zero size");
      }
    }
  };

  // Enhanced debug function with detailed information
  const debugSceneState = () => {
    if (!sceneRef.current || !cameraRef.current || !tilesRendererRef.current)
      return;

    const cameraPos = cameraRef.current.position.toArray();
    const cameraDir = cameraRef.current
      .getWorldDirection(new THREE.Vector3())
      .toArray();

    console.log("Camera position:", cameraPos);
    console.log("Camera lookAt:", cameraDir);

    setDebug((prev: any) => ({
      ...prev,
      camera: {
        position: cameraPos,
        direction: cameraDir,
      },
    }));

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
      const distance = cameraRef.current.position.distanceTo(center);
      console.log("Distance to tile center:", distance);

      // Check if the tiles group is in the camera frustum
      const frustum = new THREE.Frustum();
      const matrix = new THREE.Matrix4().multiplyMatrices(
        cameraRef.current.projectionMatrix,
        cameraRef.current.matrixWorldInverse
      );
      frustum.setFromProjectionMatrix(matrix);

      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);

      const inFrustum = frustum.intersectsSphere(sphere);
      console.log("Tiles in frustum:", inFrustum);

      setDebug((prev: any) => ({
        ...prev,
        tiles: {
          boundingBox: boxInfo,
          distance,
          inFrustum,
        },
      }));

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
      setDebug((prev: any) => ({
        ...prev,
        stats: { ...tilesRendererRef.current?.stats },
      }));
    }
  };

  // Enhanced positioning for camera and tiles
  const positionCameraAtLocation = (locationKey: string) => {
    if (!cameraRef.current || !tilesRendererRef.current) return;

    const location = locations[locationKey];

    console.log(`Positioning at ${locationKey}:`, location);

    // Use setLatLonToYUp to transform coordinates
    tilesRendererRef.current.setLatLonToYUp(
      location.lat * THREE.MathUtils.DEG2RAD,
      location.lng * THREE.MathUtils.DEG2RAD
    );

    console.log(
      "Group position after setLatLonToYUp:",
      tilesRendererRef.current.group.position.toArray()
    );

    // IMPORTANT: Set camera to a higher altitude to ensure visibility
    const camera = cameraRef.current;
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
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.minDistance = 100; // Allow closer zoom
      controlsRef.current.maxDistance = 1000000; // Allow farther zoom out
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

  // Enhanced reset view function
  const resetView = () => {
    if (!tilesRendererRef.current || !cameraRef.current) return;

    console.log("Resetting view...");

    // Reset camera to a higher position looking down
    cameraRef.current.position.set(0, 50000, 0);
    cameraRef.current.lookAt(0, 0, 0);
    cameraRef.current.near = 1;
    cameraRef.current.far = 10000000;
    cameraRef.current.updateProjectionMatrix();

    // Reset controls
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.minDistance = 100;
      controlsRef.current.maxDistance = 500000;
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

  // Helper to fit the camera to view the object
  const fitCameraToObject = (
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    object: THREE.Object3D,
    offset = 1.5 // Increased offset for better visibility
  ) => {
    const boundingBox = new THREE.Box3().setFromObject(object);

    // Check if box is valid
    if (boundingBox.isEmpty()) {
      console.warn("Cannot fit camera to empty bounding box");
      return;
    }

    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());

    // Compute the distance required for the camera to fully contain the object
    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance =
      maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = offset * Math.max(fitHeightDistance, fitWidthDistance);

    // Use a direction that's slightly offset to avoid looking straight down
    const direction = new THREE.Vector3(0.5, 1, 0.5).normalize();

    // Position the camera
    camera.position.copy(direction.multiplyScalar(distance).add(center));
    camera.lookAt(center);

    // Update near and far planes based on distance
    camera.near = distance / 100;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();

    // Update controls
    controls.target.copy(center);
    controls.update();

    console.log("Fitted camera to object:", {
      center: center.toArray(),
      size: size.toArray(),
      distance,
      cameraPos: camera.position.toArray(),
    });
  };

  // Function to extract copyright info from tiles
  const extractCopyrightInfo = (tilesRenderer: ExtendedTilesRenderer) => {
    if (!tilesRenderer) return;

    try {
      const attributions: Array<{ type: string; value: any }> = [];
      tilesRenderer.getAttributions(attributions);
      const copyrightSet = new Set<string>();
      attributions.forEach((attribution) => {
        if (
          attribution &&
          attribution.value &&
          typeof attribution.value === "string"
        ) {
          const copyrights = attribution.value.split(";");
          copyrights.forEach((copyright) => {
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

  useEffect(() => {
    // Log when the component mounts or currentLocation changes
    console.log("PhotorealisticTilesMap useEffect triggered", {
      currentLocation,
    });

    if (!mountRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      // Initialize the scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Increased ambient light
      scene.add(ambientLight);

      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(1, 1, 1);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // Add axes helper for debugging
      const axesHelper = new THREE.AxesHelper(10000);
      scene.add(axesHelper);

      // Set up the camera with improved frustum settings
      const camera = new THREE.PerspectiveCamera(
        45, // Reduced FOV for better depth perception
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        1, // Standard near plane
        100000000 // Very large far plane
      );
      cameraRef.current = camera;

      // Set up the renderer
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        logarithmicDepthBuffer: true, // Add logarithmic depth buffer for better depth precision
      });
      renderer.setSize(
        mountRef.current.clientWidth,
        mountRef.current.clientHeight
      );
      renderer.setClearColor(0x87ceeb); // Sky blue background
      renderer.shadowMap.enabled = true;
      rendererRef.current = renderer;

      // Set up OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.screenSpacePanning = false;
      controls.maxPolarAngle = Math.PI / 2;
      controls.minDistance = 100;
      controls.maxDistance = 1000000; // Increased max distance
      controlsRef.current = controls;

      // Append renderer DOM element
      mountRef.current.appendChild(renderer.domElement);

      // Load the Google 3D Tiles
      const rootUrl = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${API_KEY}`;
      console.log("Initializing tiles renderer with URL:", rootUrl);
      console.log("API Key (first 5 chars):", API_KEY.substring(0, 5) + "...");

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
      tilesRenderer.errorTarget = 24; // Increased from 12 to ensure we load more tiles
      tilesRenderer.maxDepth = 20; // Increased from 10 to allow deeper traversal
      tilesRenderer.displayActiveTiles = true; // Show tiles as they become active

      // Modified preprocessURL function with logging
      let processedUrls = new Map();
      let currentSessionId = "";

      tilesRenderer.preprocessURL = (url: string | URL) => {
        const urlString = url.toString();

        if (urlString.startsWith("blob:")) {
          return urlString;
        }

        if (processedUrls.has(urlString)) {
          return processedUrls.get(urlString);
        }

        const sessionMatch = urlString.match(/[?&]session=([^&]+)/);
        if (sessionMatch && sessionMatch[1]) {
          currentSessionId = sessionMatch[1];
          console.log("Found session ID:", currentSessionId);
        }

        let processedUrl = urlString;
        if (urlString.toLowerCase().endsWith(".glb")) {
          if (urlString.includes(`key=${API_KEY}`)) {
            if (currentSessionId && !urlString.includes("session=")) {
              const hasParams = urlString.includes("?");
              const joinChar = hasParams ? "&" : "?";
              processedUrl = `${urlString}${joinChar}session=${currentSessionId}`;
            }
          } else {
            let modified = urlString;
            if (!modified.includes(`key=${API_KEY}`)) {
              const hasParams = modified.includes("?");
              const joinChar = hasParams ? "&" : "?";
              modified = `${modified}${joinChar}key=${API_KEY}`;
            }

            if (currentSessionId && !modified.includes("session=")) {
              modified = `${modified}&session=${currentSessionId}`;
            }
            processedUrl = modified;
          }
        } else {
          if (!processedUrl.includes(`key=${API_KEY}`)) {
            const hasParams = processedUrl.includes("?");
            const joinChar = hasParams ? "&" : "?";
            processedUrl = `${processedUrl}${joinChar}key=${API_KEY}`;
          }

          if (currentSessionId && !processedUrl.includes("session=")) {
            processedUrl = `${processedUrl}&session=${currentSessionId}`;
          }
        }

        // Log URL processing (but hide the API key from logs)
        const logUrl = processedUrl.replace(API_KEY, "API_KEY");
        console.log(`Processed URL: ${urlString} → ${logUrl}`);

        processedUrls.set(urlString, processedUrl);
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
      tilesRenderer.addEventListener("load-tile-set", (event: any) => {
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

            // Use the helper to fit the camera to the tiles group
            if (
              cameraRef.current &&
              controlsRef.current &&
              tilesRenderer.group &&
              tilesRenderer.group.children.length > 0
            ) {
              console.log("Fitting camera to tiles group");
              fitCameraToObject(
                cameraRef.current,
                controlsRef.current,
                tilesRenderer.group
              );
            } else {
              console.log("Not fitting camera - no tiles or missing refs");
            }
          }, 2000);
        } else {
          setTimeout(checkLoadProgress, 100);
        }
      };

      checkLoadProgress();

      // Initially position the camera based on the selected location
      positionCameraAtLocation(currentLocation);

      // Animation loop
      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate);

        if (controlsRef.current) {
          controlsRef.current.update();
        }

        if (tilesRendererRef.current) {
          tilesRendererRef.current.update();

          // Update tile count and debug info occasionally
          if (Math.random() < 0.01) {
            // Approximately once per second
            const newTileCount = tilesRendererRef.current.group.children.length;
            if (newTileCount !== tileCount) {
              setTileCount(newTileCount);
            }

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

          extractCopyrightInfo(tilesRendererRef.current);
        }

        if (rendererRef.current && cameraRef.current && sceneRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };

      animate();

      // Handle resize events
      const handleResize = () => {
        if (!mountRef.current) return;

        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
        tilesRenderer.setResolutionFromRenderer(camera, renderer);
      };

      window.addEventListener("resize", handleResize);

      // Cleanup on unmount
      return () => {
        window.removeEventListener("resize", handleResize);

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        if (orbitIntervalRef.current) {
          clearInterval(orbitIntervalRef.current);
        }

        if (rendererRef.current && mountRef.current) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }

        if (tilesRendererRef.current) {
          tilesRendererRef.current.dispose();
        }

        if (rendererRef.current) {
          rendererRef.current.dispose();
        }
      };
    } catch (err: any) {
      console.error("Error initializing 3D tiles renderer:", err);
      setError("Failed to initialize 3D renderer: " + err.message);
      setIsLoading(false);
    }
  }, [currentLocation]);

  // Handle orbit toggle
  useEffect(() => {
    if (orbitIntervalRef.current !== null) {
      window.clearInterval(orbitIntervalRef.current);
      orbitIntervalRef.current = null;
    }

    if (isOrbiting && controlsRef.current && cameraRef.current) {
      if ("autoRotate" in controlsRef.current) {
        // @ts-ignore
        controlsRef.current.autoRotate = true;
        // @ts-ignore
        controlsRef.current.autoRotateSpeed = 2.0;
      } else {
        const center = new THREE.Vector3();
        const cameraPosition = cameraRef.current.position.clone();
        const radius = cameraPosition.distanceTo(center);
        let angle = Math.atan2(cameraPosition.x, cameraPosition.z);

        orbitIntervalRef.current = window.setInterval(() => {
          if (cameraRef.current) {
            angle += 0.01;
            cameraRef.current.position.x = Math.sin(angle) * radius;
            cameraRef.current.position.z = Math.cos(angle) * radius;
            cameraRef.current.lookAt(center);

            if (controlsRef.current) {
              controlsRef.current.update();
            }
          }
        }, 50);
      }
    } else if (controlsRef.current && "autoRotate" in controlsRef.current) {
      // @ts-ignore
      controlsRef.current.autoRotate = false;
    }

    return () => {
      if (orbitIntervalRef.current !== null) {
        window.clearInterval(orbitIntervalRef.current);
        orbitIntervalRef.current = null;
      }
      if (controlsRef.current && "autoRotate" in controlsRef.current) {
        // @ts-ignore
        controlsRef.current.autoRotate = false;
      }
    };
  }, [isOrbiting]);

  // Function to change location
  const changeLocation = (locationKey: string) => {
    setCurrentLocation(locationKey);
    if (tilesRendererRef.current && cameraRef.current) {
      positionCameraAtLocation(locationKey);
    }
  };

  // Toggle shadows
  const toggleShadows = () => {
    if (!rendererRef.current) return;
    const newShadowState = !rendererRef.current.shadowMap.enabled;
    rendererRef.current.shadowMap.enabled = newShadowState;
    if (sceneRef.current) {
      const lights = sceneRef.current.children.filter(
        (child) => child instanceof THREE.DirectionalLight
      );
      lights.forEach((light) => {
        if (light instanceof THREE.DirectionalLight) {
          light.castShadow = newShadowState;
        }
      });
    }
  };

  // Change time of day (adjust lighting)
  const changeTimeOfDay = (time: string) => {
    if (!sceneRef.current) return;
    const lights = sceneRef.current.children.filter(
      (child) => child instanceof THREE.DirectionalLight
    );
    if (lights.length === 0) return;
    const light = lights[0] as THREE.DirectionalLight;
    switch (time) {
      case "morning":
        light.position.set(-1, 0.5, 1);
        light.intensity = 0.8;
        break;
      case "noon":
        light.position.set(0, 1, 0);
        light.intensity = 1.0;
        break;
      case "evening":
        light.position.set(1, 0.3, -1);
        light.intensity = 0.7;
        break;
      case "night":
        light.position.set(0, -1, 0);
        light.intensity = 0.2;
        break;
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div ref={mountRef} style={containerStyle}>
        {/* RESET button for debugging */}
        <button
          onClick={resetView}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            padding: "10px 15px",
            backgroundColor: "red",
            color: "white",
            fontWeight: "bold",
            border: "none",
            borderRadius: "4px",
            zIndex: 1000,
            cursor: "pointer",
          }}
        >
          RESET VIEW
        </button>

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

          {/* Lighting controls */}
          <div style={{ marginBottom: "10px" }}>
            <p style={{ margin: "5px 0", fontWeight: "bold" }}>
              Lighting & Shadows:
            </p>
            <button onClick={toggleShadows} style={buttonStyle}>
              Toggle Shadows
            </button>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "5px",
                marginTop: "5px",
              }}
            >
              <button
                onClick={() => changeTimeOfDay("morning")}
                style={buttonStyle}
              >
                Morning
              </button>
              <button
                onClick={() => changeTimeOfDay("noon")}
                style={buttonStyle}
              >
                Noon
              </button>
              <button
                onClick={() => changeTimeOfDay("evening")}
                style={buttonStyle}
              >
                Evening
              </button>
              <button
                onClick={() => changeTimeOfDay("night")}
                style={buttonStyle}
              >
                Night
              </button>
            </div>
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

        {/* Debug information panel */}
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            right: "10px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "white",
            padding: "10px",
            borderRadius: "4px",
            fontSize: "10px",
            maxWidth: "300px",
            maxHeight: "150px",
            overflowY: "auto",
            zIndex: 100,
            display: Object.keys(debug).length > 0 ? "block" : "none",
          }}
        >
          <div>
            <strong>Debug Info:</strong>
          </div>
          <div>Tiles Count: {tileCount}</div>
          {debug.camera && (
            <div>
              Camera: {JSON.stringify(debug.camera.position).substring(0, 40)}
              ...
            </div>
          )}
          {debug.tiles && (
            <div>In Frustum: {debug.tiles.inFrustum ? "Yes" : "No"}</div>
          )}
          {debug.stats && (
            <div>
              Stats: Visible {debug.stats.visible || 0}, Active{" "}
              {debug.stats.active || 0}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotorealisticTilesMap;
