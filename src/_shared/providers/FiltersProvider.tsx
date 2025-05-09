import React, { createContext, useState, useContext, useEffect } from "react";

export interface FiltersState {
  // Filters options
  sunQualityOptions: SunQuality[];
  areaTypeOptions: AreaType[];

  // Filters
  sunQualityFilters: SunQuality[];
  areaTypeFilters: AreaType[];

  // View
  viewFilters: boolean;

  // List View
  viewAsList: boolean;

  // Timestamp for localStorage
  timestamp: number;
}

interface FiltersContextType {
  filtersState: FiltersState;
  updateFiltersState: (newState: Partial<FiltersState>) => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "filtersState";

export enum SunQuality {
  GOOD = "GOOD",
  SOME = "SOME",
  NO = "NO",
}

export enum AreaType {
  // { key: "pavement", label: "Pavement" },
  // { key: "frontage-seating", label: "Frontage Seating" },
  // { key: "terrace", label: "Terrace" },
  // { key: "terrace-waterfront", label: "Waterfront Terrace" },
  // { key: "beer-garden", label: "Beer Garden" },
  // { key: "courtyard", label: "Courtyard" },
  PAVEMENT = "pavement",
  FRONTAGE_SEATING = "frontage-seating",
  TERRACE = "terrace",
  TERRACE_WATERFRONT = "terrace-waterfront",
  BEER_GARDEN = "beer-garden",
  COURTYARD = "courtyard",
}

const defaultState: FiltersState = {
  // Filters options
  sunQualityOptions: [SunQuality.GOOD, SunQuality.SOME, SunQuality.NO],
  areaTypeOptions: [
    AreaType.PAVEMENT,
    AreaType.FRONTAGE_SEATING,
    AreaType.TERRACE,
    AreaType.TERRACE_WATERFRONT,
    AreaType.BEER_GARDEN,
    AreaType.COURTYARD,
  ],

  // Filters
  sunQualityFilters: [SunQuality.GOOD, SunQuality.SOME],
  areaTypeFilters: [
    AreaType.PAVEMENT,
    AreaType.FRONTAGE_SEATING,
    AreaType.TERRACE,
    AreaType.TERRACE_WATERFRONT,
    AreaType.BEER_GARDEN,
    AreaType.COURTYARD,
  ],

  // View
  viewFilters: false,

  // View as list
  viewAsList: false,

  // Timestamp for localStorage
  timestamp: Date.now(),
};

export const FiltersProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [filtersState, setFiltersState] = useState<FiltersState>(() => {
    // Try to load the state from localStorage on initial render
    const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (storedState) {
      const parsedState: FiltersState = JSON.parse(storedState);
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
    const stateToStore: FiltersState = {
      ...filtersState,
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToStore));
  }, [filtersState]);

  const updateFiltersState = (newState: Partial<FiltersState>) => {
    setFiltersState((prevState) => ({ ...prevState, ...newState }));
  };

  return (
    <FiltersContext.Provider value={{ filtersState, updateFiltersState }}>
      {children}
    </FiltersContext.Provider>
  );
};

export const useFiltersContext = (): FiltersContextType => {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error("useFiltersContext must be used within a FiltersProvider");
  }
  return context;
};
