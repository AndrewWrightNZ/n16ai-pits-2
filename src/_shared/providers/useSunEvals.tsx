import React, { createContext, useState, useContext, useEffect } from "react";

export interface SunEvalsState {
  // Sun evals details
  selectedTimeslot: number | null;

  // Timestamp for localStorage
  timestamp: number;
}

interface SunEvalsContextType {
  sunEvalsState: SunEvalsState;
  updateSunEvalsState: (newState: Partial<SunEvalsState>) => void;
}

const SunEvalsContext = createContext<SunEvalsContextType | undefined>(
  undefined
);

const LOCAL_STORAGE_KEY = "sunEvalsState";

const defaultState: SunEvalsState = {
  // Sun evals details
  selectedTimeslot: null,

  // Timestamp for localStorage
  timestamp: Date.now(),
};

export const SunEvalsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sunEvalsState, setSunEvalsState] = useState<SunEvalsState>(() => {
    // Try to load the state from localStorage on initial render
    const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (storedState) {
      const parsedState: SunEvalsState = JSON.parse(storedState);
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
    const stateToStore: SunEvalsState = {
      ...sunEvalsState,
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToStore));
  }, [sunEvalsState]);

  const updateSunEvalsState = (newState: Partial<SunEvalsState>) => {
    setSunEvalsState((prevState) => ({ ...prevState, ...newState }));
  };

  return (
    <SunEvalsContext.Provider value={{ sunEvalsState, updateSunEvalsState }}>
      {children}
    </SunEvalsContext.Provider>
  );
};

export const useSunEvalsContext = (): SunEvalsContextType => {
  const context = useContext(SunEvalsContext);
  if (!context) {
    throw new Error(
      "useSunEvalsContext must be used within a SunEvalsProvider"
    );
  }
  return context;
};
