import {
  MapSettingsState,
  useMapSettingsContext,
} from "../context/useMapSettingsContext";

interface HookData extends MapSettingsState {}

interface HookOperations {
  // View
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

  return {
    data: {
      // View
      isLoading,
      loadingProgress,

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
      onSetIsOrbiting,
      onSetTimeSpeed,
      onSetIsLoading,
      onSetLoadingProgress,

      // Location
      onSetCurrentLocation,

      // Meta
      onSetCopyrightInfo,
    },
  };
};

export default useMapSettings;
