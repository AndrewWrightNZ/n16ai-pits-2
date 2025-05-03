import { Helmet } from "react-helmet";
import { Map, useMap, AdvancedMarker } from "@vis.gl/react-google-maps";
import { useState, useEffect, useCallback } from "react";

// Providers
import GoogleMapsProvider from "../../providers/GoogleMapsProvider";

// Hooks
import usePubs from "./_shared/hooks/usePubs";

// Components
import PubInTheSunMapHeader from "./_shared/components/PubsInTheSunMapHeader";
import RenderPubsOfType from "./_shared/components/renderPubsOfType";
import TimeSlider from "./_shared/components/timeSlider";
import PubCounts from "./_shared/components/counts";

// Default center (London)
const defaultCenter = {
  lat: 51.5074,
  lng: -0.1278,
};

// Map ID for Advanced Markers
const MAP_ID = "1f450011d145e0c4";

function Finder() {
  //

  // State
  const [center, setCenter] = useState(defaultCenter);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] =
    useState<google.maps.LatLngLiteral | null>(null);

  //

  // Hooks
  const {
    data: { selectedPub = null },
    operations: { onSetMapBounds },
  } = usePubs();

  // MapBoundsHandler component to handle bounds changes
  const MapBoundsHandler = () => {
    const map = useMap();

    useEffect(() => {
      if (!map || !onSetMapBounds) return;

      setMapInstance(map);

      const boundsChangedListener = map.addListener("bounds_changed", () => {
        const bounds = map.getBounds();
        if (bounds) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          onSetMapBounds({
            north: ne.lat(),
            east: ne.lng(),
            south: sw.lat(),
            west: sw.lng(),
          });
        }
      });

      return () => {
        google.maps.event.removeListener(boundsChangedListener);
      };
    }, [map]);

    return null;
  };

  // Handle user location detection
  const handleFindMyLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCenter(userLocation);
          setUserLocation(userLocation);
          if (mapInstance) {
            mapInstance.panTo(userLocation);
            mapInstance.setZoom(15); // Zoom in when finding user location
          }
        },
        (error) => {
          console.error("Error getting user location:", error);
          alert(
            "Unable to retrieve your location. Please check your browser settings."
          );
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  }, [mapInstance]);

  // Effect to automatically get user location on component mount
  useEffect(() => {
    handleFindMyLocation();
  }, []);

  // Effect to center map on selected pub
  useEffect(() => {
    if (selectedPub && mapInstance) {
      const position = {
        lat: selectedPub.latitude,
        lng: selectedPub.longitude,
      };
      mapInstance.panTo(position);
      mapInstance.setZoom(17);
    }
  }, [selectedPub, mapInstance]);

  return (
    <>
      <Helmet>
        <title>
          Pubs in the Sun | Find Sunny Beer Gardens/Terraces/Pavements Near You
        </title>
        <meta
          name="description"
          content="Discover the best pubs with sunny beer gardens, terraces, pavements and outdoor seating near you. Perfect for summer days and warm evenings."
        />
      </Helmet>

      <main className="w-full h-[100vh] rounded-lg overflow-hidden shadow-lg relative">
        <GoogleMapsProvider>
          <Map
            style={{
              width: "100%",
              height: "100%",
            }}
            defaultCenter={center}
            defaultZoom={15}
            gestureHandling="greedy"
            mapTypeControl={true}
            streetViewControl={true}
            zoomControl={true}
            fullscreenControl={true}
            mapId={MAP_ID}
          >
            <MapBoundsHandler />
            <PubInTheSunMapHeader />
            <PubCounts />
            <RenderPubsOfType />
            {userLocation && (
              <AdvancedMarker position={userLocation}>
                <div style={{ fontSize: "24px" }}>🤠</div>
              </AdvancedMarker>
            )}
            <TimeSlider />
          </Map>
        </GoogleMapsProvider>
      </main>
    </>
  );
}

export default Finder;
