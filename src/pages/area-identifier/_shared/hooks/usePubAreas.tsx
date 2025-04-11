import { useMutation } from "@tanstack/react-query";
import { supabaseClient } from "../../../../_shared/hooks/useSupabase";
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
  pub_id: number;
  latitude: number;
  longitude: number;
  camera_position: SimpleCameraPosition;
}

interface CreateNewPubAreaProps {
  draftPubArea: {
    name: string;
    description: string;
    type: string;
    latitude: number;
    longitude: number;
    camera_position: SimpleCameraPosition;
  };
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

  // Mutations
  const { mutate: saveNewPubArea, isPending: isSavingNewPubArea } = useMutation(
    {
      mutationFn: async ({ draftPubArea }: CreateNewPubAreaProps) => {
        // Create a unique ID from the timestamp
        const id = Date.now();

        const { data, error } = await supabaseClient.from("pub_area").insert([
          {
            ...draftPubArea,
            id,
          },
        ]);

        if (error) throw error;

        return data;
      },
    }
  );

  //

  // Handlers
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

    saveNewPubArea(
      {
        draftPubArea: completePubAreaDetails,
      },
      {
        onSuccess: () => {
          console.log("Pub area details saved successfully!");
        },
        onError: (error) => {
          console.error("Error saving pub area details:", error);
        },
      }
    );

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
