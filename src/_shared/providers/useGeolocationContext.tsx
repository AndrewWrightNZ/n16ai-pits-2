// GeoLocationContext.tsx
import React, { createContext, useState, useContext, useEffect } from "react";

export interface GeoLocationState {
  userLatitude: number;
  userLongitude: number;
  timestamp: number;

  // Cookies
  userHasAcceptedCookies: boolean;
  // Add other state properties here
}

interface GeoLocationContextType {
  geoLocationState: GeoLocationState;
  updateGeoLocationState: (newState: Partial<GeoLocationState>) => void;
}

const GeoLocationContext = createContext<GeoLocationContextType | undefined>(
  undefined
);

const LOCAL_STORAGE_KEY = "GeoLocationState";

const defaultState: GeoLocationState = {
  userLatitude: 0,
  userLongitude: 0,
  timestamp: Date.now(),
  userHasAcceptedCookies: false,
};

export const GeoLocationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [geoLocationState, setGeoLocationState] = useState<GeoLocationState>(
    () => {
      // Try to load the state from localStorage on initial render
      const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);

      if (storedState) {
        const parsedState: GeoLocationState = JSON.parse(storedState);
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

        // Check if the stored state is less than thirty days old
        if (now - parsedState.timestamp < thirtyDays) {
          // If it's less than thirty days old, use the stored state
          return parsedState;
        }
      }

      return defaultState;
    }
  );

  useEffect(() => {
    // Save to localStorage whenever the state changes, including the current timestamp
    const stateToStore: GeoLocationState = {
      ...geoLocationState,
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToStore));
  }, [geoLocationState]);

  const updateGeoLocationState = (newState: Partial<GeoLocationState>) => {
    setGeoLocationState((prevState) => ({ ...prevState, ...newState }));
  };

  return (
    <GeoLocationContext.Provider
      value={{ geoLocationState, updateGeoLocationState }}
    >
      {children}
    </GeoLocationContext.Provider>
  );
};

export const useGeoLocationContext = (): GeoLocationContextType => {
  const context = useContext(GeoLocationContext);
  if (!context) {
    throw new Error(
      "useGeoLocationContext must be used within a GeoLocationProvider"
    );
  }
  return context;
};
