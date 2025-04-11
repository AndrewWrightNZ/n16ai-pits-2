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

interface PolygonCoordinate {
  lat: number;
  lng: number;
}

interface MapDrawingComponentProps {
  onAreaChange?: (area: number) => void;
  onPolygonComplete?: (coordinates: PolygonCoordinate[]) => void;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  height?: string;
  className?: string;
}

export interface MapDrawingRef {
  clearShape: () => void;
  getShapeCoordinates: () => PolygonCoordinate[] | null;
  calculateCurrentArea: () => number;
  isMapReady: boolean;
  getMap: () => google.maps.Map | null;
  setCenter: (lat: number, lng: number) => void;
  setZoom: (zoom: number) => void;
}

const MapDrawingComponent = forwardRef<MapDrawingRef, MapDrawingComponentProps>(
  (
    {
      onAreaChange,
      onPolygonComplete,
      initialCenter = { lat: 51.5074, lng: -0.1278 },
      initialZoom = 18,
      height = "500px",
      className = "",
    },
    ref
  ) => {
    // Basic refs
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(
      null
    );
    const shapeRef = useRef<google.maps.Polygon | null>(null);
    const loadingDivRef = useRef<HTMLDivElement | null>(null);
    const isMountedRef = useRef(true);

    // Calculate area for a polygon
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

    // Get coordinates of the current shape
    const getShapeCoordinates = useCallback((): PolygonCoordinate[] | null => {
      if (!shapeRef.current) return null;

      try {
        const path = shapeRef.current.getPath();
        const coordinates: PolygonCoordinate[] = [];

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

    // Clear the current shape
    const clearShape = useCallback(() => {
      if (shapeRef.current) {
        shapeRef.current.setMap(null);
        shapeRef.current = null;

        if (isMountedRef.current && onAreaChange) {
          onAreaChange(0);
        }

        // Let parent know polygon is gone
        if (onPolygonComplete) {
          onPolygonComplete([]);
        }
      }
    }, [onAreaChange, onPolygonComplete]);

    // Set center position (without any side effects)
    const setCenter = useCallback((lat: number, lng: number) => {
      if (!mapInstanceRef.current) return;

      try {
        mapInstanceRef.current.setCenter({ lat, lng });
      } catch (error) {
        console.error("Error setting center:", error);
      }
    }, []);

    // Set zoom level (without any side effects)
    const setZoom = useCallback((zoom: number) => {
      if (!mapInstanceRef.current) return;

      try {
        mapInstanceRef.current.setZoom(zoom);
      } catch (error) {
        console.error("Error setting zoom:", error);
      }
    }, []);

    // Initialize Google Maps
    useEffect(() => {
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

          // Create the map
          const map = new google.maps.Map(mapRef.current, {
            center: initialCenter,
            zoom: initialZoom,
            mapTypeId: google.maps.MapTypeId.HYBRID,
            streetViewControl: false,
            tilt: 0, // Disable 45-degree tilt
            styles: [
              {
                featureType: "all",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
            ],
            zoomControl: true,
            mapTypeControl: true,
            scaleControl: true,
            rotateControl: false,
          });

          mapInstanceRef.current = map;

          // Create drawing manager
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
                // Clear previous shape
                if (shapeRef.current) {
                  shapeRef.current.setMap(null);
                }

                // Store the new shape
                const newShape = event.overlay as google.maps.Polygon;
                shapeRef.current = newShape;

                // Calculate area
                calculateArea(newShape);

                // Get and store the coordinates
                const coordinates = getShapeCoordinates();

                // Notify parent component of the completed polygon
                if (coordinates && onPolygonComplete) {
                  onPolygonComplete(coordinates);
                }

                // Add listeners for shape editing
                const path = newShape.getPath();
                const pathUpdateHandler = () => {
                  if (isMountedRef.current) {
                    // Recalculate area
                    calculateArea(newShape);

                    // Update coordinates in parent if available
                    const updatedCoordinates = getShapeCoordinates();
                    if (updatedCoordinates && onPolygonComplete) {
                      onPolygonComplete(updatedCoordinates);
                    }
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

        if (shapeRef.current) {
          shapeRef.current.setMap(null);
          shapeRef.current = null;
        }

        if (drawingManagerRef.current) {
          drawingManagerRef.current.setMap(null);
          drawingManagerRef.current = null;
        }
      };
    }, [
      initialCenter,
      initialZoom,
      calculateArea,
      getShapeCoordinates,
      onPolygonComplete,
    ]);

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
        setCenter,
        setZoom,
      }),
      [clearShape, getShapeCoordinates, calculateArea, setCenter, setZoom]
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
