import {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Loader } from "@googlemaps/js-api-loader";

// API key from environment variables
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface MapDrawingComponentProps {
  onAreaChange?: (area: number) => void;
  onShapeChange?: (shape: google.maps.Polygon | null) => void;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  height?: string;
  className?: string;
}

export interface MapDrawingRef {
  clearShape: () => void;
  getShapeCoordinates: () => Array<{ lat: number; lng: number }> | null;
  calculateCurrentArea: () => number;
  isMapReady: boolean;
  getMap: () => google.maps.Map | null;
  getDrawingManager: () => google.maps.drawing.DrawingManager | null;
  panTo: (lat: number, lng: number) => void;
}

// Extremely simplified drawing component - focus only on essential functionality
const MapDrawingComponent = forwardRef<MapDrawingRef, MapDrawingComponentProps>(
  (
    {
      onAreaChange,
      onShapeChange,
      initialCenter = { lat: 51.5074, lng: -0.1278 },
      initialZoom = 18,
      height = "500px",
      className = "",
    },
    ref
  ) => {
    // DOM elements and Google Maps objects
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(
      null
    );
    const shapeRef = useRef<google.maps.Polygon | null>(null);
    const isMountedRef = useRef(true);
    const loadingDivRef = useRef<HTMLDivElement | null>(null);

    // Area calculation function
    const calculateArea = useCallback(
      (shape: google.maps.Polygon): number => {
        if (!shape || !window.google) return 0;

        try {
          const path = shape.getPath();
          const area = google.maps.geometry.spherical.computeArea(path);

          if (onAreaChange && isMountedRef.current) {
            onAreaChange(area);
          }

          return area;
        } catch (e) {
          console.error("Error calculating area:", e);
          return 0;
        }
      },
      [onAreaChange]
    );

    // Clear the current shape
    const clearShape = useCallback(() => {
      if (shapeRef.current) {
        shapeRef.current.setMap(null);
        shapeRef.current = null;

        if (isMountedRef.current) {
          if (onAreaChange) onAreaChange(0);
          if (onShapeChange) onShapeChange(null);
        }
      }
    }, [onAreaChange, onShapeChange]);

    // Pan the map to a specific location
    const panTo = useCallback((lat: number, lng: number) => {
      if (!mapInstanceRef.current) {
        console.log("Map not initialized yet");
        return;
      }

      try {
        // Pan the map to the specified coordinates
        mapInstanceRef.current.panTo({ lat, lng });

        // Set an appropriate zoom level for viewing a pub
        mapInstanceRef.current.setZoom(19);

        // Add a marker if needed
        // This is optional, but can be useful to mark the selected pub
        if (window.google) {
          // Clear any existing markers first
          // This assumes you're tracking markers somewhere, which you should add if needed

          // Create a new marker
          new google.maps.Marker({
            position: { lat, lng },
            map: mapInstanceRef.current,
            animation: google.maps.Animation.DROP,
          });
        }
      } catch (error) {
        console.error("Error panning to location:", error);
      }
    }, []);

    // Get coordinates of the current shape
    const getShapeCoordinates = useCallback((): Array<{
      lat: number;
      lng: number;
    }> | null => {
      if (!shapeRef.current) return null;

      try {
        const path = shapeRef.current.getPath();
        const coordinates: Array<{ lat: number; lng: number }> = [];

        for (let i = 0; i < path.getLength(); i++) {
          const point = path.getAt(i);
          coordinates.push({
            lat: point.lat(),
            lng: point.lng(),
          });
        }

        return coordinates;
      } catch (e) {
        console.error("Error getting coordinates:", e);
        return null;
      }
    }, []);

    // Initialize Google Maps once
    useEffect(() => {
      // Clean up any existing state first (in case of remounting)
      if (shapeRef.current) {
        shapeRef.current.setMap(null);
        shapeRef.current = null;
      }

      if (drawingManagerRef.current) {
        drawingManagerRef.current.setMap(null);
        drawingManagerRef.current = null;
      }

      // Set mounted flag
      isMountedRef.current = true;

      // Initialize map
      const initMap = async () => {
        if (!mapRef.current) return;

        try {
          // Load the Maps JavaScript API
          const loader = new Loader({
            apiKey: GOOGLE_MAPS_API_KEY,
            version: "weekly",
            libraries: ["drawing", "geometry"],
          });

          await loader.load();

          if (!isMountedRef.current || !mapRef.current) return;

          // Create the map with custom styles to remove labels
          const map = new google.maps.Map(mapRef.current, {
            center: initialCenter,
            zoom: initialZoom,
            mapTypeId: google.maps.MapTypeId.HYBRID,
            streetViewControl: false,
            // Disable 45-degree tilt
            tilt: 0,
            // Disable labels
            styles: [
              {
                featureType: "all",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
            ],
            // Additional options to improve the look
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: true,
            scaleControl: true,
            rotateControl: false, // Disable rotate control
          });

          mapInstanceRef.current = map;

          // Create drawing manager with polygon mode
          const drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: google.maps.drawing.OverlayType.POLYGON,
            drawingControl: true,
            drawingControlOptions: {
              position: google.maps.ControlPosition.TOP_CENTER,
              drawingModes: [google.maps.drawing.OverlayType.POLYGON],
            },
            polygonOptions: {
              fillColor: "#4285F4",
              fillOpacity: 0.3,
              strokeWeight: 2,
              strokeColor: "#4285F4",
              clickable: true,
              editable: true,
            },
          });

          drawingManager.setMap(map);
          drawingManagerRef.current = drawingManager;

          // Handle shape drawing completion
          google.maps.event.addListener(
            drawingManager,
            "overlaycomplete",
            (event: any) => {
              if (!isMountedRef.current) return;

              // Switch out of drawing mode
              drawingManager.setDrawingMode(null);

              if (event.type === google.maps.drawing.OverlayType.POLYGON) {
                // Remove previous shape if it exists
                if (shapeRef.current) {
                  shapeRef.current.setMap(null);
                }

                // Store the new shape
                const newShape = event.overlay as google.maps.Polygon;
                shapeRef.current = newShape;

                // Calculate area
                calculateArea(newShape);

                if (onShapeChange && isMountedRef.current) {
                  onShapeChange(newShape);
                }

                // Add listeners for shape editing
                const path = newShape.getPath();
                const pathUpdateHandler = () => {
                  if (isMountedRef.current) {
                    calculateArea(newShape);
                  }
                };

                // Listen for shape editing events
                google.maps.event.addListener(
                  path,
                  "set_at",
                  pathUpdateHandler
                );
                google.maps.event.addListener(
                  path,
                  "insert_at",
                  pathUpdateHandler
                );
                google.maps.event.addListener(
                  path,
                  "remove_at",
                  pathUpdateHandler
                );
              }
            }
          );

          // Remove loading indicator
          if (
            loadingDivRef.current &&
            mapRef.current.contains(loadingDivRef.current)
          ) {
            loadingDivRef.current.style.display = "none";
          }
        } catch (error) {
          console.error("Error initializing map:", error);
        }
      };

      initMap();

      // Cleanup on unmount
      return () => {
        isMountedRef.current = false;

        // Clear the shape
        if (shapeRef.current) {
          shapeRef.current.setMap(null);
          shapeRef.current = null;
        }

        // Clear the drawing manager
        if (drawingManagerRef.current) {
          drawingManagerRef.current.setMap(null);
          drawingManagerRef.current = null;
        }
      };
    }, [initialCenter, initialZoom, calculateArea, onShapeChange]);

    // Export methods via ref
    useImperativeHandle(
      ref,
      () => ({
        clearShape,
        getShapeCoordinates,
        calculateCurrentArea: () =>
          shapeRef.current ? calculateArea(shapeRef.current) : 0,
        isMapReady: !!mapInstanceRef.current,
        getMap: () => mapInstanceRef.current,
        getDrawingManager: () => drawingManagerRef.current,
        panTo,
      }),
      [clearShape, getShapeCoordinates, calculateArea, panTo]
    );

    return (
      <div
        ref={mapRef}
        className={`w-full relative ${className}`}
        style={{ height }}
      >
        <div
          ref={loadingDivRef}
          className="absolute inset-0 flex items-center justify-center bg-gray-100"
        >
          <div className="text-gray-600">Loading map...</div>
        </div>
      </div>
    );
  }
);

export default MapDrawingComponent;
