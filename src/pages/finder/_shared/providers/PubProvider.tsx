// pubContext.tsx
import React, { createContext, useState, useContext, useEffect } from "react";

export interface PubState {
  selectedPubId: number;
  hoveredPubId: number;

  timestamp: number;

  // Filters
  selectedFilters: string[];

  // Map Bounds
  mapBounds: google.maps.LatLngBoundsLiteral;
}

interface PubContextType {
  pubState: PubState;
  updatePubState: (newState: Partial<PubState>) => void;
}

const PubContext = createContext<PubContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "pubState";

const defaultState: PubState = {
  selectedPubId: 0,
  hoveredPubId: 0,
  timestamp: Date.now(),
  selectedFilters: ["full_sun", "partial_sun"],
  mapBounds: {
    north: 0,
    south: 0,
    east: -0,
    west: -0,
  },
};

export const PubProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [pubState, setPubState] = useState<PubState>(() => {
    // Try to load the state from localStorage on initial render
    const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (storedState) {
      const parsedState: PubState = JSON.parse(storedState);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

      // Check if the stored state is less than 1 hour old
      if (now - parsedState.timestamp < oneHour) {
        // If it's less than 1 hour old, use the stored state
        return parsedState;
      }
    }

    return defaultState;
  });

  useEffect(() => {
    // Save to localStorage whenever the state changes, including the current timestamp
    const stateToStore: PubState = {
      ...pubState,
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToStore));
  }, [pubState]);

  const updatePubState = (newState: Partial<PubState>) => {
    setPubState((prevState) => ({ ...prevState, ...newState }));
  };

  return (
    <PubContext.Provider value={{ pubState, updatePubState }}>
      {children}
    </PubContext.Provider>
  );
};

export const usePubContext = (): PubContextType => {
  const context = useContext(PubContext);
  if (!context) {
    throw new Error("usePubContext must be used within a PubProvider");
  }
  return context;
};
