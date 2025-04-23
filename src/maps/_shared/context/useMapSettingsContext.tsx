"use client";
import React, { createContext, useState, useContext, useEffect } from "react";
import * as THREE from "three";

// Data
import { PRESET_LOCATIONS } from "../hooks/locationsData";

export interface MapSettingsState {
  // View
  isLoading: boolean;
  loadingProgress: number;

  error: string | null;
  tileCount: number;

  isOrbiting: boolean;
  timeOfDay: Date;
  timeSpeed: number;
  showWhiteTiles: boolean;

  formattedTime: string;

  // Light reference
  lightRef?: THREE.DirectionalLight;

  // Locations
  currentLocation: string;

  // Meta
  copyrightInfo: string;
}

interface InternalContextType {
  internalState: MapSettingsState;
  updateInternalState: (newState: Partial<MapSettingsState>) => void;
}

const MapSettingsContext = createContext<InternalContextType | undefined>(
  undefined
);

const LOCAL_STORAGE_KEY = "MapSettingsState";

const defaultState: MapSettingsState = {
  // View
  isLoading: true,
  loadingProgress: 0,

  error: null,
  tileCount: 0,

  isOrbiting: false,
  timeOfDay: new Date(),
  timeSpeed: 0,
  showWhiteTiles: true,
  formattedTime: "12:00 PM",

  // Locations
  currentLocation: Object.keys(PRESET_LOCATIONS)[0],

  // Meta
  copyrightInfo: "",
};

export const MapSettingsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // Keep internal variables simple
  const [localState, setState] = useState<MapSettingsState>(() => {
    // Try to load the state from localStorage on initial render
    if (typeof window !== "undefined") {
      const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);

      if (storedState) {
        // Parse stored state but omit the lightRef as it can't be serialized
        const parsedState = JSON.parse(storedState);
        // Remove any serialized lightRef property if somehow present
        if ("lightRef" in parsedState) {
          delete parsedState.lightRef;
        }
        return parsedState;
      }

      return defaultState;
    } else {
      return defaultState;
    }
  });

  useEffect(() => {
    // Save to localStorage whenever the state changes
    if (typeof window !== "undefined") {
      // Clone state and remove lightRef before serializing
      const stateToStore = { ...localState };
      if ("lightRef" in stateToStore) {
        delete stateToStore.lightRef;
      }

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToStore));
    }
  }, [localState]);

  const updateLocalState = (newState: Partial<MapSettingsState>) => {
    setState((prevState) => ({ ...prevState, ...newState }));
  };

  return (
    <MapSettingsContext.Provider
      value={{
        internalState: localState,
        updateInternalState: updateLocalState,
      }}
    >
      {children}
    </MapSettingsContext.Provider>
  );
};

export const useMapSettingsContext = (): InternalContextType => {
  const context = useContext(MapSettingsContext);
  if (!context) {
    throw new Error("useMapSettings must be used within a MapSettingsContext");
  }
  return context;
};
