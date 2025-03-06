import React, { useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";

// Explicitly define container style with a fixed height
const containerStyle = {
  width: "100%",
  height: "600px",
  margin: "0 auto",
};

// San Francisco coordinates - great for 3D visualizations
const initialCenter = {
  lat: 37.7749,
  lng: -122.4194,
};

// Define libraries with proper typing
const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = [
  "places",
];

function PhotorealisticMap() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(12); // Default to noon
  const mapRef = useRef<HTMLDivElement | null>(null);
  const orbitIntervalRef = useRef<number | null>(null);
  const orbitSpeedRef = useRef(1); // Degrees per step

  // Advanced 3D map options with WebGL features
  const mapOptions = {
    // Basic map settings
    center: initialCenter,
    zoom: 18, // Higher zoom for better 3D detail
    mapTypeId: "satellite",

    // Essential controls
    zoomControl: true,
    mapTypeControl: true,
    rotateControl: true,

    // 3D settings
    tilt: 45,
    heading: 0,

    // Advanced rendering settings
    mapId: "8e0a97af9386fef", // This is a placeholder - use your actual WebGL-enabled mapId

    // WebGL and atmosphere settings
    styles: [
      {
        featureType: "all",
        elementType: "labels",
        stylers: [{ visibility: "on" }],
      },
    ],

    // Control options
    disableDefaultUI: false,

    // Enable WebGL renderer explicitly
    webglEnabled: true,
    webglPowerPreference: "high-performance",

    // Rendering preferences
    scrollwheel: true,
    streetViewControl: true,
    fullscreenControl: true,
  };

  // Log any loading errors
  useEffect(() => {
    if (loadError) {
      console.error("Error loading Google Maps:", loadError);
    }
  }, [loadError]);

  // Handle orbit functionality
  useEffect(() => {
    // Clean up any existing interval first
    if (orbitIntervalRef.current) {
      window.clearInterval(orbitIntervalRef.current);
      orbitIntervalRef.current = null;
    }

    // Start a new interval if orbiting is enabled
    if (isOrbiting && map) {
      console.log("Starting orbit with speed:", orbitSpeedRef.current);
      orbitIntervalRef.current = window.setInterval(() => {
        if (map) {
          const currentHeading = map.getHeading() || 0;
          map.setHeading((currentHeading + orbitSpeedRef.current) % 360);
        }
      }, 100);
    }

    // Cleanup function
    return () => {
      if (orbitIntervalRef.current) {
        window.clearInterval(orbitIntervalRef.current);
        orbitIntervalRef.current = null;
      }
    };
  }, [isOrbiting, map]);

  // Handle map load
  const onLoad = React.useCallback(function callback(
    mapInstance: google.maps.Map
  ) {
    console.log("Map loaded successfully");

    try {
      // Set initial map properties
      mapInstance.setCenter(initialCenter);
      mapInstance.setZoom(mapOptions.zoom);
      mapInstance.setTilt(mapOptions.tilt);

      // Apply advanced WebGL settings
      const mapDiv = mapInstance.getDiv();
      if (mapDiv) {
        // Force WebGL rendering mode if available
        mapDiv.classList.add("use-webgl");
      }

      console.log("3D map settings applied successfully");
    } catch (error) {
      console.error("Error applying map settings:", error);
    }

    setMap(mapInstance);
  },
  []);

  const onUnmount = React.useCallback(function callback() {
    console.log("Map unmounted");

    // Make sure to clear any intervals when unmounting
    if (orbitIntervalRef.current) {
      window.clearInterval(orbitIntervalRef.current);
      orbitIntervalRef.current = null;
    }

    setMap(null);
  }, []);

  // Change time of day to adjust shadows
  const changeTimeOfDay = (hour: number) => {
    if (!map) return;

    try {
      // This is a custom approach to simulate time of day
      // Google Maps doesn't directly expose this feature, but we can
      // simulate it with lighting adjustments

      // Calculate shadow angle (simplified approximation)
      const shadowAngle = (hour - 12) * 15;

      console.log(
        "Changing time of day to",
        hour,
        "for shadow angle",
        shadowAngle
      );

      map.setOptions({
        styles: [
          {
            featureType: "all",
            elementType: "geometry",
            stylers: [
              { lightness: hour < 12 || hour > 16 ? -10 : 0 },
              { saturation: hour < 12 || hour > 16 ? -10 : 0 },
            ],
          },
        ],
      });

      setTimeOfDay(hour);
      console.log(`Time of day changed to ${hour}:00`);
    } catch (error) {
      console.error("Error changing time of day:", error);
    }
  };

  // Handle map click to set orbit center
  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (map && event.latLng) {
      map.setCenter(event.latLng);
      console.log("New orbit center set:", event.latLng.toString());

      // Optionally start orbiting if not already
      if (!isOrbiting) {
        setIsOrbiting(true);
      }
    }
  };

  // Handle loading states
  if (loadError) {
    return <div>Error loading Google Maps: {loadError.message}</div>;
  }

  if (!isLoaded) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Loading Google Maps...
      </div>
    );
  }

  return (
    <div
      className="map-container"
      style={{ position: "relative", width: "100%", height: "650px" }}
    >
      <div ref={mapRef} style={{ width: "100%", height: "100%" }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          options={mapOptions}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={handleMapClick}
        >
          {/* Child components, such as markers, info windows, etc. */}
          <></>
        </GoogleMap>
      </div>

      {/* Controls for the 3D view */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          padding: "10px",
          borderRadius: "4px",
          maxWidth: "280px",
        }}
      >
        <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>
          Click on map to set orbit center
        </p>

        {/* Camera controls */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => {
              if (map) map.setTilt(map.getTilt() === 0 ? 45 : 0);
            }}
            style={{
              padding: "8px 12px",
              backgroundColor: "#fff",
              border: "1px solid #ccc",
              borderRadius: "4px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              cursor: "pointer",
            }}
          >
            Toggle Tilt
          </button>
          <button
            onClick={() => {
              if (map) map.setHeading((map.getHeading() || 0) + 45);
            }}
            style={{
              padding: "8px 12px",
              backgroundColor: "#fff",
              border: "1px solid #ccc",
              borderRadius: "4px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              cursor: "pointer",
            }}
          >
            Rotate View
          </button>
        </div>

        {/* Orbit camera controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={() => setIsOrbiting(!isOrbiting)}
            style={{
              padding: "8px 12px",
              backgroundColor: isOrbiting ? "#f0ad4e" : "#fff",
              color: isOrbiting ? "#fff" : "#000",
              border: "1px solid #ccc",
              borderRadius: "4px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {isOrbiting ? "Stop Orbit" : "Start Orbit"}
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => {
                orbitSpeedRef.current = Math.max(
                  0.2,
                  orbitSpeedRef.current - 0.2
                );
                console.log("Orbit speed decreased to:", orbitSpeedRef.current);
                if (!isOrbiting) setIsOrbiting(true);
              }}
              style={{
                padding: "8px 12px",
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                cursor: "pointer",
                flex: 1,
              }}
            >
              Slower
            </button>
            <button
              onClick={() => {
                orbitSpeedRef.current = Math.min(
                  5,
                  orbitSpeedRef.current + 0.2
                );
                console.log("Orbit speed increased to:", orbitSpeedRef.current);
                if (!isOrbiting) setIsOrbiting(true);
              }}
              style={{
                padding: "8px 12px",
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                cursor: "pointer",
                flex: 1,
              }}
            >
              Faster
            </button>
          </div>
        </div>

        {/* Time of day controls for shadows */}
        <div style={{ marginTop: "10px" }}>
          <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>
            Time of Day (for shadows):
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => changeTimeOfDay(8)} // Morning
              style={{
                padding: "8px 12px",
                backgroundColor: timeOfDay === 8 ? "#5bc0de" : "#fff",
                color: timeOfDay === 8 ? "#fff" : "#000",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                cursor: "pointer",
                flex: 1,
              }}
            >
              Morning
            </button>
            <button
              onClick={() => changeTimeOfDay(12)} // Noon
              style={{
                padding: "8px 12px",
                backgroundColor: timeOfDay === 12 ? "#5bc0de" : "#fff",
                color: timeOfDay === 12 ? "#fff" : "#000",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                cursor: "pointer",
                flex: 1,
              }}
            >
              Noon
            </button>
            <button
              onClick={() => changeTimeOfDay(17)} // Evening
              style={{
                padding: "8px 12px",
                backgroundColor: timeOfDay === 17 ? "#5bc0de" : "#fff",
                color: timeOfDay === 17 ? "#fff" : "#000",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                cursor: "pointer",
                flex: 1,
              }}
            >
              Evening
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(PhotorealisticMap);
