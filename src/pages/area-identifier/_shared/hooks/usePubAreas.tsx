import {
  PubAreasState,
  usePubAreasContext,
} from "../providers/PubAreasProvider";

interface PubAreasData extends PubAreasState {
  // Add properties relevant to PubAreasData
}

interface SimpleCameraPosition {
  position: {
    x: number;
    y: number;
    z: number;
  };
  target: {
    x: number;
    y: number;
    z: number;
  };
}

interface SavePubAreaDetailsPayload {
  pubId: number;
  latitude: number;
  longitude: number;
  cameraPosition: SimpleCameraPosition;
}

interface PubAreasOperations {
  // Add properties relevant to PubAreasOperations
  onUpdatePubAreaDetails: (newDetails: Partial<PubAreasState>) => void;

  // Save to DB
  onSavePubAreaDetails: (payload: SavePubAreaDetailsPayload) => void;
}

interface PubAreasResponse {
  data: PubAreasData;
  operations: PubAreasOperations;
}

const usePubAreas = (): PubAreasResponse => {
  //

  // Context
  const { pubAreasState, updatePubAreasState } = usePubAreasContext();

  //

  // Variables
  const { name, description, type } = pubAreasState;

  //

  // Update details
  const onUpdatePubAreaDetails = (newDetails: Partial<PubAreasState>) => {
    updatePubAreasState(newDetails);
  };

  const onSavePubAreaDetails = (payload: SavePubAreaDetailsPayload) => {
    const completePubAreaDetails = {
      name,
      description,
      type,
      ...payload,
    };

    console.log(
      "Complete pub area details to save to DB:",
      completePubAreaDetails
    );
  };

  return {
    data: {
      ...pubAreasState,
    },
    operations: {
      // Update details
      onUpdatePubAreaDetails,

      // Save
      onSavePubAreaDetails,
    },
  };
};

export default usePubAreas;
