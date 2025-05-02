import { Filter } from "lucide-react";
import { Helmet } from "react-helmet";
import { Link } from "@tanstack/react-router";
import { GoogleMap } from "@react-google-maps/api";
import { useState, useEffect, useCallback } from "react";

// Hooks
import usePubs from "./_shared/hooks/usePubs";
import usePubAreas from "../areas/identifier/_shared/hooks/usePubAreas";

// Components
import AreaTypeFilter from "./_shared/components/areaTypeFIlter";
import RenderPubsOfType from "./_shared/components/renderPubsOfType";

// Default center (London)
const defaultCenter = {
  lat: 51.5074,
  lng: -0.1278,
};

function Finder() {
  // State for Google Maps
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Hooks from your existing code
  const {
    data: { uiReadyPubs = [], pubsInTheSun = [], selectedPub = null },
    operations: { onSetMapBounds },
  } = usePubs();

  const {
    data: { selectedAreaTypes = [] },
  } = usePubAreas();

  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  // Handle map bounds change
  const onBoundsChanged = useCallback(() => {
    if (mapInstance) {
      const bounds = mapInstance.getBounds();
      if (bounds && onSetMapBounds) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        onSetMapBounds({
          north: ne.lat(),
          east: ne.lng(),
          south: sw.lat(),
          west: sw.lng(),
        });
      }
    }
  }, [mapInstance, onSetMapBounds]);

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

      <main className="w-full flex flex-col items-center">
        <div className="w-full h-[100vh] rounded-lg overflow-hidden shadow-lg relative">
          <GoogleMap
            mapContainerStyle={{
              width: "100%",
              height: "100%",
            }}
            center={center}
            zoom={13}
            onLoad={onMapLoad}
            onBoundsChanged={onBoundsChanged}
            options={{
              gestureHandling: "greedy",
              styles: [],
              mapTypeControl: true,
              streetViewControl: true,
              zoomControl: true,
              fullscreenControl: true,
            }}
          >
            {/* <RenderPubsOfType filterName="full_sun" /> */}
          </GoogleMap>
        </div>
      </main>
    </>
  );
}

export default Finder;
