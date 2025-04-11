// StaticMapView.tsx
import React, { useEffect, useRef } from "react";

interface PolygonCoordinate {
  lat: number;
  lng: number;
}

interface StaticMapViewProps {
  center: { lat: number; lng: number };
  polygon: PolygonCoordinate[];
  zoom?: number;
  height?: string;
  className?: string;
}

const StaticMapView: React.FC<StaticMapViewProps> = ({
  center,
  polygon,
  zoom = 19,
  height = "800px",
  className = "",
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    // Initialize static map
    const initMap = async () => {
      if (!mapRef.current || !window.google) return;

      try {
        // Create the map
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeId: google.maps.MapTypeId.HYBRID,
          streetViewControl: false,
          tilt: 0,
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
          // Disable all interactive controls for static view
          draggable: false,
          disableDoubleClickZoom: true,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;

        // Create the polygon overlay
        if (polygon && polygon.length > 2) {
          const polygonPath = polygon.map((point) => ({
            lat: point.lat,
            lng: point.lng,
          }));

          const polygonOverlay = new google.maps.Polygon({
            paths: polygonPath,
            strokeColor: "#4285F4",
            strokeOpacity: 1.0,
            strokeWeight: 3,
            fillColor: "#4285F4",
            fillOpacity: 0.35,
            editable: false,
            draggable: false,
          });

          polygonOverlay.setMap(map);
          polygonRef.current = polygonOverlay;

          // Auto-fit the map to the polygon bounds
          const bounds = new google.maps.LatLngBounds();
          polygonPath.forEach((point) => bounds.extend(point));
          map.fitBounds(bounds);

          // Add a small padding
          const padding = {
            top: 50,
            right: 50,
            bottom: 50,
            left: 50,
          };

          map.fitBounds(bounds, padding);
        }
      } catch (error) {
        console.error("Error initializing static map:", error);
      }
    };

    if (window.google && window.google.maps) {
      initMap();
    } else {
      console.error("Google Maps API not loaded");
    }

    return () => {
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
      }
    };
  }, [center, polygon, zoom]);

  return (
    <div ref={mapRef} className={`w-full ${className}`} style={{ height }} />
  );
};

export default StaticMapView;
