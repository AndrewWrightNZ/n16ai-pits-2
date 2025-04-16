import { Helmet } from "react-helmet";
import { useState, useEffect, useCallback } from "react";
import { GoogleMap, LoadScript, InfoWindow } from "@react-google-maps/api";

// Hooks
import usePubs from "./_shared/hooks/usePubs";
import { Pub } from "../../_shared/types";

// Components for custom markers
import RenderPubsOfType from "./_shared/components/renderPubsOfType";

// Map container style
const mapContainerStyle = {
  width: "100%",
  height: "80%",
  borderRadius: "12px",
};

// Default center (London)
const defaultCenter = {
  lat: 51.5074,
  lng: -0.1278,
};

function Finder() {
  // State for Google Maps
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const [activeInfoWindow, setActiveInfoWindow] = useState<Pub | null>(null);

  // Hooks from your existing code
  const {
    data: { uiReadyPubs = [], pubsInTheSun = [], selectedPub = null },
    operations: { onSetMapBounds, onSetSelectedPubId },
  } = usePubs();

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

  // Close info window
  const handleInfoWindowClose = useCallback(() => {
    setActiveInfoWindow(null);
    onSetSelectedPubId(0);

    if (mapInstance) {
      mapInstance.setZoom(13); // Reset zoom level
    }
  }, [onSetSelectedPubId]);

  // Effect to center map on selected pub
  useEffect(() => {
    if (selectedPub && mapInstance) {
      const position = {
        lat: selectedPub.latitude,
        lng: selectedPub.longitude,
      };
      mapInstance.panTo(position);
      mapInstance.setZoom(17);
      setActiveInfoWindow(selectedPub);
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

      <div className="bg-[#F3F1E5] min-h-screen flex flex-col items-center">
        <header className="w-full mb-6">
          <h1 className="sr-only">Pubs in the Sun</h1>
        </header>

        <main className="w-full flex flex-col items-center">
          <div className="w-full mb-8">
            <h2 className="text-2xl font-medium font-poppins mb-2 text-center">
              Use the Pubs in the Sun map to find the best sunny beer gardens
              near you.
            </h2>
            <p className="text-sm font-normal font-poppins text-center mb-4">
              Search from over {uiReadyPubs.length} pubs we track in London
              (showing {pubsInTheSun.length})
            </p>

            <div className="w-full flex justify-center mb-4">
              <button
                onClick={handleFindMyLocation}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-full flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                Find pubs near me
              </button>
            </div>

            {/* Filter controls could go here */}

            {/* Google Maps Component */}
            <div className="w-full h-[90vh] rounded-lg overflow-hidden shadow-lg">
              <LoadScript
                googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              >
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
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
                  {/* Render pubs by sun category */}
                  <RenderPubsOfType filterName="full_sun" />
                  {/* <RenderPubsOfType filterName="partial_sun" />
                  <RenderPubsOfType filterName="no_sun" /> */}

                  {/* Show info window for active pub */}
                  {activeInfoWindow && (
                    <InfoWindow
                      position={{
                        lat: activeInfoWindow.latitude,
                        lng: activeInfoWindow.longitude,
                      }}
                      onCloseClick={handleInfoWindowClose}
                    >
                      <div className="info-window max-w-xs">
                        <h3 className="text-lg font-bold mb-1">
                          {activeInfoWindow.name}
                        </h3>
                        <p className="text-sm mb-2">
                          {activeInfoWindow.address_text}
                        </p>
                        {!!activeInfoWindow.id && (
                          <p className="text-sm mb-2">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                              Outdoor Seating
                            </span>
                          </p>
                        )}
                        <div className="flex justify-between mt-2">
                          <a
                            href={`https://maps.google.com/maps?daddr=${activeInfoWindow.latitude},${activeInfoWindow.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Get Directions
                          </a>
                          <a
                            href={`/pub/${activeInfoWindow.id}`}
                            className="text-amber-600 hover:text-amber-800 text-sm"
                          >
                            View Details
                          </a>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              </LoadScript>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default Finder;
