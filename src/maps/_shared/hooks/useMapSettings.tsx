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

  onSetTimeOfDay: (newTime: Date) => void;

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
    formattedTime,

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

  const onSetTimeOfDay = (newTime: Date) => {
    const formattedTime = newTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    updateInternalState({ timeOfDay: newTime, formattedTime });
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
      formattedTime,

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
      onSetTimeOfDay,

      // Location
      onSetCurrentLocation,

      // Meta
      onSetCopyrightInfo,
    },
  };
};

export default useMapSettings;
