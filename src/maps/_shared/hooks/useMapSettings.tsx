import {
  MapSettingsState,
  useMapSettingsContext,
} from "../context/useMapSettingsContext";

interface HookData extends MapSettingsState {}

interface HookOperations {
  // View
  onSetIsOrbiting: (newIsOrbiting: boolean) => void;

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

  return {
    data: {
      // View
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

      // Location
      onSetCurrentLocation,

      // Meta
      onSetCopyrightInfo,
    },
  };
};

export default useMapSettings;
