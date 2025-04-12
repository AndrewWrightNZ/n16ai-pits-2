import React, { createContext, useState, useContext, useEffect } from "react";

export interface PubLabelsState {
  // Label details
  name: string;
  description: string;
  type: string;

  // Timestamp for localStorage
  timestamp: number;
}

interface PubLabelsContextType {
  pubLabelsState: PubLabelsState;
  updatePubLabelsState: (newState: Partial<PubLabelsState>) => void;
}

const PubLabelsContext = createContext<PubLabelsContextType | undefined>(
  undefined
);

const LOCAL_STORAGE_KEY = "pubLabelsState";

const defaultState: PubLabelsState = {
  // Label details
  name: "",
  description: "",
  type: "",

  // Timestamp for localStorage
  timestamp: Date.now(),
};

export const PubLabelsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [pubLabelsState, setPubLabelsState] = useState<PubLabelsState>(() => {
    // Try to load the state from localStorage on initial render
    const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (storedState) {
      const parsedState: PubLabelsState = JSON.parse(storedState);
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
    const stateToStore: PubLabelsState = {
      ...pubLabelsState,
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToStore));
  }, [pubLabelsState]);

  const updatePubLabelsState = (newState: Partial<PubLabelsState>) => {
    setPubLabelsState((prevState) => ({ ...prevState, ...newState }));
  };

  return (
    <PubLabelsContext.Provider value={{ pubLabelsState, updatePubLabelsState }}>
      {children}
    </PubLabelsContext.Provider>
  );
};

export const usePubLabelsContext = (): PubLabelsContextType => {
  const context = useContext(PubLabelsContext);
  if (!context) {
    throw new Error(
      "usePubLabelsContext must be used within a PubLabelsProvider"
    );
  }
  return context;
};
