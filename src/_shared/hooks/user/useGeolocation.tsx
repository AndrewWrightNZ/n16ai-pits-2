import { useState, useEffect } from "react";

//

// Contexts
import {
  GeoLocationState,
  useGeoLocationContext,
} from "../../providers/useGeolocationContext";

//

// Types

interface GeoLocationData extends GeoLocationState {
  // User Location
  error: string;
  isLoading: boolean;
}

interface GeoLocationOperations {
  onAcceptCookies: () => void;
}

interface HookShape {
  data: GeoLocationData;
  operations: GeoLocationOperations;
}

const useUserGeoLocation = (): HookShape => {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  //

  // Contexts
  const { geoLocationState, updateGeoLocationState } = useGeoLocationContext();

  //

  // Handlers

  const onAcceptCookies = () => {
    updateGeoLocationState({ userHasAcceptedCookies: true });
  };

  //

  // Effects

  useEffect(() => {
    const getUserLocation = () => {
      if (!("geolocation" in navigator)) {
        setError("Geolocation is not supported by your browser");
        return;
      }

      setIsLoading(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: userLatitude, longitude: userLongitude } =
            position.coords;
          updateGeoLocationState({ userLatitude, userLongitude });

          setIsLoading(false);
        },
        (error) => {
          setIsLoading(false);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setError("User denied the request for Geolocation.");
              break;
            case error.POSITION_UNAVAILABLE:
              setError("Location information is unavailable.");
              break;
            case error.TIMEOUT:
              setError("The request to get user location timed out.");
              break;
            default:
              setError("An unknown error occurred.");
          }
        }
      );
    };

    getUserLocation();
  }, []);

  return {
    data: {
      ...geoLocationState,

      // User Location
      error,
      isLoading,
    },
    operations: {
      onAcceptCookies,
    },
  };
};

export default useUserGeoLocation;
