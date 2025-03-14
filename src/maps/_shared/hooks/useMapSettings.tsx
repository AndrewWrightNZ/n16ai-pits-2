import {
  MapSettingsState,
  useMapSettingsContext,
} from "../context/useMapSettingsContext";

interface HookData extends MapSettingsState {}

interface HookOperations {
  // View
  onSetError: (newError: string | null) => void;
  onSetTileCount: (newCount: number) => void;

  onSetIsOrbiting: (newIsOrbiting: boolean) => void;
  onSetTimeSpeed: (newSpeed: number) => void;
  onSetIsLoading: (newIsLoading: boolean) => void;
  onSetLoadingProgress: (newProgress: number) => void;

  // Location
  onSetCurrentLocation: (newLocation: string) => void;

  // Meta
  onSetCopyrightInfo: (newInfo: string) => void;
}

interface HookResponse {
  data: HookData;
  operations: HookOperations;
}

const useMapSettings = (): HookResponse => {
  //

  // Context
  const { internalState, updateInternalState } = useMapSettingsContext();

  //

  // Variables
  const {
    isLoading,
    loadingProgress,

    error,
    tileCount,

    isOrbiting,
    timeOfDay,
    timeSpeed,

    // Locations
    currentLocation,

    // Meta
    copyrightInfo,
  } = internalState || {};

  //

  // Handlers

  const onSetIsOrbiting = (newIsOrbiting: boolean) => {
    updateInternalState({ isOrbiting: newIsOrbiting });
  };

  const onSetCopyrightInfo = (newInfo: string) => {
    updateInternalState({ copyrightInfo: newInfo });
  };

  const onSetCurrentLocation = (newLocation: string) => {
    updateInternalState({ currentLocation: newLocation });
  };

  const onSetTimeSpeed = (newSpeed: number) => {
    updateInternalState({ timeSpeed: newSpeed });
  };

  const onSetIsLoading = (newIsLoading: boolean) => {
    updateInternalState({ isLoading: newIsLoading });
  };

  const onSetLoadingProgress = (newProgress: number) => {
    updateInternalState({ loadingProgress: newProgress });
  };

  const onSetError = (newError: string | null) => {
    updateInternalState({ error: newError });
  };

  const onSetTileCount = (newCount: number) => {
    updateInternalState({ tileCount: newCount });
  };

  return {
    data: {
      // View
      isLoading,
      loadingProgress,

      error,
      tileCount,

      isOrbiting,
      timeOfDay,
      timeSpeed,

      // Locations
      currentLocation,

      // Meta
      copyrightInfo,
    },
    operations: {
      // View
      onSetIsLoading,
      onSetLoadingProgress,

      onSetError,
      onSetTileCount,

      onSetIsOrbiting,
      onSetTimeSpeed,

      // Location
      onSetCurrentLocation,

      // Meta
      onSetCopyrightInfo,
    },
  };
};

export default useMapSettings;
