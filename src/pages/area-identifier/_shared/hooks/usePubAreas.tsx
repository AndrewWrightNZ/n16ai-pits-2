import { useMutation, useQuery } from "@tanstack/react-query";

// Hooks
import { supabaseClient } from "../../../../_shared/hooks/useSupabase";

// Providers
import {
  PubAreasState,
  usePubAreasContext,
} from "../providers/PubAreasProvider";

// TYpes
import { Pub, PubArea, SimpleCameraPosition } from "../../../../_shared/types";

interface PubAreasData extends PubAreasState {
  // Loading
  isSavingNewPubArea: boolean;
  isLoadingAreasForPub: boolean;
  isSavingFloorArea: boolean;

  // Areas
  areasForPub: PubArea[];
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

export interface PolygonCoordinate {
  lat: number;
  lng: number;
}

interface SaveFloorAreaPayload {
  pub_area_id: number;
  floor_area: number;
  coordinates: PolygonCoordinate[];
}

interface PubAreasOperations {
  // Select pub
  onSetSelectedPub: (pub: Pub) => void;

  // Add properties relevant to PubAreasOperations
  onUpdatePubAreaDetails: (newDetails: Partial<PubAreasState>) => void;

  // Save to DB
  onSavePubAreaDetails: (payload: SavePubAreaDetailsPayload) => void;
  onSaveFloorArea: (payload: SaveFloorAreaPayload) => void;
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
  const { name, description, type, selectedPub } = pubAreasState;

  //

  // Query functions
  const fetchAreasForPub = async (): Promise<PubArea[]> => {
    // Fetch where pubId is selectedPubId and the date is today
    const { data, error } = await supabaseClient
      .from("pub_area")
      .select()
      .eq("pub_id", selectedPub?.id);

    if (error) throw error;
    return data;
  };

  //

  // Queries

  const GET_PUB_AREAS_QUERY_KEY = ["getPubAreas", selectedPub?.id];
  const {
    data: areasForPub = [],
    isLoading: isLoadingAreasForPub,
    refetch: onRefetchAreasForPub,
  } = useQuery({
    queryKey: GET_PUB_AREAS_QUERY_KEY,
    queryFn: () => fetchAreasForPub(),
    enabled: !!selectedPub,
  });

  //

  // Mutations
  const { mutate: saveNewPubArea, isPending: isSavingNewPubArea } = useMutation(
    {
      mutationFn: async ({ draftPubArea }: CreateNewPubAreaProps) => {
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

  const { mutate: saveFloorArea, isPending: isSavingFloorArea } = useMutation({
    mutationFn: async ({
      pub_area_id,
      floor_area,
      coordinates,
    }: SaveFloorAreaPayload) => {
      console.log("Saving floor area:", {
        pub_area_id,
        floor_area,
        coordinates,
      });

      // Update floor aera for the pub area
      const { data, error } = await supabaseClient
        .from("pub_area")
        .update({ floor_area, coordinates })
        .eq("id", pub_area_id);
      if (error) throw error;
      return data;
    },
  });

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
          // Reset the details
          updatePubAreasState({
            name: "",
            description: "",
            type: "",
          });

          onRefetchAreasForPub();
        },
        onError: (error) => {
          console.error("Error saving pub area details:", error);
        },
      }
    );
  };

  const onSaveFloorArea = (payload: SaveFloorAreaPayload) => {
    saveFloorArea(
      {
        ...payload,
      },
      {
        onSuccess: () => {
          // Reset the selected area
          onRefetchAreasForPub();
        },
        onError: (error) => {
          console.error("Error saving floor area:", error);
        },
      }
    );
  };

  const onSetSelectedPub = (pub: Pub) => {
    updatePubAreasState({
      selectedPub: pub,
      name: "",
      description: "",
      type: "",
    });
  };

  return {
    data: {
      ...pubAreasState,

      // Loading
      isSavingNewPubArea,
      isLoadingAreasForPub,
      isSavingFloorArea,

      // Areas
      areasForPub,
    },
    operations: {
      // Select pub
      onSetSelectedPub,

      // Update details
      onUpdatePubAreaDetails,

      // Save
      onSavePubAreaDetails,
      onSaveFloorArea,
    },
  };
};

export default usePubAreas;
