import React, { createContext, useState, useContext, useEffect } from "react";

export interface PubAreasState {
  // Area details
  name: string;
  description: string;
  type: string;
  selectedPubId: number | null;

  // Area types filters
  selectedAreaTypes: string[];

  // Timestamp for localStorage
  timestamp: number;
}

interface PubAreasContextType {
  pubAreasState: PubAreasState;
  updatePubAreasState: (newState: Partial<PubAreasState>) => void;
}

const PubAreasContext = createContext<PubAreasContextType | undefined>(
  undefined
);

const LOCAL_STORAGE_KEY = "pubAreasState";

const defaultState: PubAreasState = {
  // Area details
  name: "",
  description: "",
  type: "",
  selectedPubId: null,

  // Area types filters
  selectedAreaTypes: ["pavement", "beer-garden"],

  // Timestamp for localStorage
  timestamp: Date.now(),
};

export const PubAreasProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [pubAreasState, setPubAreasState] = useState<PubAreasState>(() => {
    // Try to load the state from localStorage on initial render
    const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (storedState) {
      const parsedState: PubAreasState = JSON.parse(storedState);
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
    const stateToStore: PubAreasState = {
      ...pubAreasState,
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToStore));
  }, [pubAreasState]);

  const updatePubAreasState = (newState: Partial<PubAreasState>) => {
    setPubAreasState((prevState) => ({ ...prevState, ...newState }));
  };

  return (
    <PubAreasContext.Provider value={{ pubAreasState, updatePubAreasState }}>
      {children}
    </PubAreasContext.Provider>
  );
};

export const usePubAreasContext = (): PubAreasContextType => {
  const context = useContext(PubAreasContext);
  if (!context) {
    throw new Error(
      "usePubAreasContext must be used within a PubAreasProvider"
    );
  }
  return context;
};
