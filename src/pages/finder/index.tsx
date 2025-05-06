import { Helmet } from "react-helmet";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useState, useEffect, useCallback } from "react";

// Hooks
import usePubs from "../../_shared/hooks/pubs/usePubs";
import usePubAreas from "../../_shared/hooks/pubAreas/usePubAreas";

// Components
import RenderFilteredMarkers from "./_shared/components/markers";
import PubInTheSunMapHeader from "./_shared/components/PubsInTheSunMapHeader";
import ExpandableBottomDrawer from "./_shared/components/expandableBottomDrawer";
import OpenCloseFiltersButton from "./_shared/components/filters/openCloseFiltersButton";

// Default center (London)
const defaultCenter = {
  lat: 51.5074,
  lng: -0.1278,
};

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
    operations: { onSetMapBounds },
  } = usePubs();

  const {
    data: { selectedPub = null },
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
        <GoogleMap
          mapContainerStyle={{
            width: "100%",
            height: "100%",
          }}
          center={center}
          zoom={15}
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
          <PubInTheSunMapHeader />
          {!selectedPub?.id && <OpenCloseFiltersButton />}
          <RenderFilteredMarkers />
          {userLocation && (
            <Marker
              position={userLocation}
              icon={{
                path: "M0,0",
                fillOpacity: 0,
                strokeOpacity: 0,
                scale: 0,
                labelOrigin: new google.maps.Point(0, 0),
              }}
              label={{
                text: "🤠",
                fontSize: "24px",
                className: "marker-label",
              }}
            />
          )}

          <ExpandableBottomDrawer />
        </GoogleMap>
      </main>
    </>
  );
}

export default Finder;
