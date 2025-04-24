import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Hooks
import { supabaseClient } from "../../../../_shared/hooks/useSupabase";

// Providers
import {
  PubAreasState,
  usePubAreasContext,
} from "../providers/PubAreasProvider";

// Types
import { Pub, PubArea, SimpleCameraPosition } from "../../../../_shared/types";

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

interface SetPubAreasPresentPayload {
  pub_id: number;
}

interface PubAreasData extends PubAreasState {
  // Loading
  isSavingNewPubArea: boolean;
  isLoadingAreasForPub: boolean;
  isLoadingSelectedPub: boolean;
  isLoadingAllAvailableAreas: boolean;

  isSavingFloorArea: boolean;
  isSettingPubAreasPresent: boolean;
  isSettingPubAreasMeasured: boolean;
  isLoadingAreasOfTypes: boolean;

  // Selected pub
  selectedPub: Pub | null;

  // Areas
  areasForPub: PubArea[];
  areasOfTypes: PubArea[];
  allAvailableAreas: PubArea[];

  // Filters
  availableAreaTypes: string[];
}

interface PubAreasOperations {
  // Select pub
  onSetSelectedPub: (pub: Pub) => void;

  // Add properties relevant to PubAreasOperations
  onUpdatePubAreaDetails: (newDetails: Partial<PubAreasState>) => void;

  // Area type filtering
  onToggleAreaTypeFilter: (type: string) => void;

  // UI filtering
  onSelectAreaType: (type: string) => void;

  // Select pub area
  onSelectPubArea: (pubArea: PubArea) => void;

  // Database updates
  onSavePubAreaDetails: (payload: SavePubAreaDetailsPayload) => void;
  onSaveFloorArea: (payload: SaveFloorAreaPayload) => void;
  onSetPubAreasPresentForPub: () => void;
  onSetPubAreasMeasuredForPub: () => void;
}

interface PubAreasResponse {
  data: PubAreasData;
  operations: PubAreasOperations;
}

const usePubAreas = (): PubAreasResponse => {
  // Hooks
  const queryClient = useQueryClient();

  // Context
  const { pubAreasState, updatePubAreasState } = usePubAreasContext();

  // Variables
  const {
    name,
    description,
    type,
    selectedPubId,
    selectedAreaTypes = [],
  } = pubAreasState;

  // Query functions
  const fetchAreasForPub = async (): Promise<PubArea[]> => {
    // Fetch where pubId is selectedPubId and the date is today
    const { data, error } = await supabaseClient
      .from("pub_area")
      .select()
      .eq("pub_id", selectedPubId);

    if (error) throw error;
    return data;
  };

  const fetchAreasOfType = async (): Promise<PubArea[]> => {
    // Fetch pub areas where the type matches any of the selected area types
    const { data, error } = await supabaseClient
      .from("pub_area")
      .select()
      .in("type", selectedAreaTypes);

    if (error) throw error;
    return data;
  };

  const fetchAllAvailableAreas = async (): Promise<PubArea[]> => {
    // Fetch all available pub areas
    const { data, error } = await supabaseClient.from("pub_area").select();

    if (error) throw error;
    return data;
  };

  // Query functions
  const fetchPubById = async () => {
    const { data, error } = await supabaseClient
      .from("pub")
      .select("*")
      .eq("id", selectedPubId);

    if (error) throw new Error(error.message);
    return data?.[0] as Pub;
  };

  // Queries
  const GET_PUB_AREAS_QUERY_KEY = ["getPubAreas", selectedPubId];

  const GET_PUB_BY_ID_QUERY_KEY = ["pubById", selectedPubId];
  const GET_ALL_AVAILABLE_AREAS_QUERY_KEY = ["getAllAvailableAreas"];

  const GET_PUB_AREAS_OF_TYPES_QUERY_KEY = [
    "getPubAreasOfTypes",
    ...selectedAreaTypes,
  ];

  const {
    data: areasForPub = [],
    isLoading: isLoadingAreasForPub,
    refetch: onRefetchAreasForPub,
  } = useQuery({
    queryKey: GET_PUB_AREAS_QUERY_KEY,
    queryFn: fetchAreasForPub,
    enabled: !!selectedPubId,
  });

  // When areasForPub changes after selecting a pub, set selectedPubArea to the first area
  useEffect(() => {
    if (selectedPubId && areasForPub && areasForPub.length > 0) {
      updatePubAreasState({ selectedPubArea: areasForPub[0] });
    }
    // Optionally, you may want to clear selectedPubArea if areasForPub becomes empty
    // else if (selectedPubId && areasForPub && areasForPub.length === 0) {
    //   updatePubAreasState({ selectedPubArea: null });
    // }
  }, [selectedPubId, areasForPub]);

  const { data: areasOfTypes = [], isLoading: isLoadingAreasOfTypes } =
    useQuery({
      queryKey: GET_PUB_AREAS_OF_TYPES_QUERY_KEY,
      queryFn: fetchAreasOfType,
    });

  const {
    data: allAvailableAreas = [],
    isLoading: isLoadingAllAvailableAreas,
  } = useQuery({
    queryKey: GET_ALL_AVAILABLE_AREAS_QUERY_KEY,
    queryFn: fetchAllAvailableAreas,
  });

  const {
    data: selectedPub = null,
    isLoading: isLoadingSelectedPub,
    refetch: onRefetchSelectedPub,
  } = useQuery({
    queryKey: GET_PUB_BY_ID_QUERY_KEY,
    queryFn: fetchPubById,
    enabled: !!selectedPubId,
  });

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
      // Update floor area for the pub area
      const { data, error } = await supabaseClient
        .from("pub_area")
        .update({ floor_area, coordinates })
        .eq("id", pub_area_id);
      if (error) throw error;
      return data;
    },
  });

  const { mutate: setPubAreasPresent, isPending: isSettingPubAreasPresent } =
    useMutation({
      mutationFn: async ({ pub_id }: SetPubAreasPresentPayload) => {
        // Update floor area for the pub area
        const { data, error } = await supabaseClient
          .from("pub")
          .update({ has_areas_added: true })
          .eq("id", pub_id);
        if (error) throw error;
        return data;
      },
    });

  const { mutate: setPubAreasMeasured, isPending: isSettingPubAreasMeasured } =
    useMutation({
      mutationFn: async ({ pub_id }: SetPubAreasPresentPayload) => {
        // Update floor area for the pub area
        const { data, error } = await supabaseClient
          .from("pub")
          .update({ has_areas_measured: true })
          .eq("id", pub_id);
        if (error) throw error;
        return data;
      },
    });

  //

  // Variables
  const availableAreaTypes = allAvailableAreas.reduce(
    (acc: string[], area: PubArea) => {
      if (!acc.includes(area.type)) {
        acc.push(area.type);
      }
      return acc;
    },
    []
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

  const onSetPubAreasPresentForPub = () => {
    setPubAreasPresent(
      {
        pub_id: selectedPubId || 0,
      },
      {
        onSuccess: () => {
          // Manually update the query
          onRefetchSelectedPub();

          // Refetch the 'pubs' query
          queryClient.refetchQueries({
            queryKey: ["pubs"],
          });
        },
        onError: (error) => {
          console.error("Error saving floor area:", error);
        },
      }
    );
  };

  const onSetPubAreasMeasuredForPub = () => {
    setPubAreasMeasured(
      {
        pub_id: selectedPubId || 0,
      },
      {
        onSuccess: () => {
          // Manually update the query
          queryClient.setQueryData(
            GET_PUB_BY_ID_QUERY_KEY,
            (oldData: Pub | undefined) => {
              if (!oldData) return null;
              return { ...oldData, has_areas_measured: true };
            }
          );

          // Refetch the 'pubs' query
          queryClient.refetchQueries({
            queryKey: ["pubs"],
          });
        },
        onError: (error) => {
          console.error("Error saving floor area:", error);
        },
      }
    );
  };

  const onSetSelectedPub = (pub: Pub) => {
    updatePubAreasState({
      selectedPubId: pub.id,
      name: "",
      description: "",
      type: "",
    });
  };

  const onToggleAreaTypeFilter = (type: string) => {
    const currentSelectedTypes = selectedAreaTypes || [];
    const newSelectedTypes = currentSelectedTypes.includes(type)
      ? currentSelectedTypes.filter((t) => t !== type)
      : [...currentSelectedTypes, type];

    updatePubAreasState({ selectedAreaTypes: newSelectedTypes });
  };

  const onSelectAreaType = (type: string) => {
    const currentSelectedTypes = selectedAreaTypes || [];
    const newSelectedTypes = currentSelectedTypes.includes(type)
      ? currentSelectedTypes.filter((t) => t !== type)
      : [...currentSelectedTypes, type];

    updatePubAreasState({ selectedAreaTypes: newSelectedTypes });
  };

  const onSelectPubArea = (pubArea: PubArea) => {
    updatePubAreasState({ selectedPubArea: pubArea });
  };

  return {
    data: {
      ...pubAreasState,

      // Loading
      isSavingNewPubArea,
      isLoadingAreasForPub,
      isLoadingSelectedPub,
      isLoadingAllAvailableAreas,
      isSavingFloorArea,
      isSettingPubAreasPresent,
      isSettingPubAreasMeasured,
      isLoadingAreasOfTypes,

      // Pub
      selectedPub,

      // Areas
      areasForPub,
      areasOfTypes,
      allAvailableAreas,

      // Filters
      availableAreaTypes,
    },
    operations: {
      // Select pub
      onSetSelectedPub,

      // Update details
      onUpdatePubAreaDetails,

      // Area type filtering
      onToggleAreaTypeFilter,

      // UI filtering
      onSelectAreaType,

      // Select pub area
      onSelectPubArea,

      // Update DB
      onSavePubAreaDetails,
      onSaveFloorArea,
      onSetPubAreasPresentForPub,
      onSetPubAreasMeasuredForPub,
    },
  };
};

export default usePubAreas;
