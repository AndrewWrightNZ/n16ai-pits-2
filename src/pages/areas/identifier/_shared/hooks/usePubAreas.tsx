import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Hooks
import { supabaseClient } from "../../../../../_shared/hooks/useSupabase";

// Providers
import {
  PubAreasState,
  usePubAreasContext,
} from "../providers/PubAreasProvider";

// Types
import {
  SimpleCameraPosition,
  Pub,
  PubArea,
} from "../../../../../_shared/types";

// Types

interface SaveVisionMaskPayload {
  pubAreaId: number;
  visionMaskPoints: { x: number; y: number }[];
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

interface SetPubAreasPresentPayload {
  pub_id: number;
}

interface PubAreasData extends PubAreasState {
  // Loading
  isSavingNewPubArea: boolean;
  isLoadingAreasForPub: boolean;
  isLoadingSelectedPub: boolean;
  isLoadingAllAvailableAreas: boolean;
  isSavingVisionMask: boolean;

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

  // Simulation
  currentSimulationPubIndex: number;
  simulationReadyPubs: Pub[];
}

interface PubAreasOperations {
  // Select pub
  onSetSelectedPub: (pub: Pub | null) => void;

  // Add properties relevant to PubAreasOperations
  onUpdatePubAreaDetails: (newDetails: Partial<PubAreasState>) => void;

  // Area type filtering
  onToggleAreaTypeFilter: (type: string) => void;

  // UI filtering
  onSelectAreaType: (type: string) => void;

  // Select pub area
  onSelectPubArea: (pubArea: PubArea) => void;
  onGoToPreviousArea: () => void;
  onGoToNextArea: () => void;

  // Create masks
  onSaveMask: (bagOfPoints: { x: number; y: number }[]) => void;
  onGoToNextPub: () => void;

  // Database updates
  onSavePubAreaDetails: (payload: SavePubAreaDetailsPayload) => void;
  onSaveFloorArea: (payload: SaveFloorAreaPayload) => void;
  onSetPubAreasPresentForPub: () => void;
  onSetPubAreasMeasuredForPub: () => void;

  // Simulation
  onSimulateNextPub: () => void;
}

interface PubAreasResponse {
  data: PubAreasData;
  operations: PubAreasOperations;
}

const usePubAreas = (): PubAreasResponse => {
  //

  // Hooks
  const queryClient = useQueryClient();

  //

  // Context
  const { pubAreasState, updatePubAreasState } = usePubAreasContext();

  //

  // Variables
  const {
    name,
    description,
    type,
    selectedPubId,
    selectedAreaTypes = [],
    selectedPubArea,
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

  const fetchMaskReadyPubs = async () => {
    // Get pubs where the has_areas_measured is true
    const { data, error } = await supabaseClient
      .from("pub")
      .select()
      // has areas measured but doesn't have vision mask
      .eq("has_areas_measured", true)
      .is("has_vision_masks_added", null);
    if (error) throw error;
    return data;
  };

  const fetchSimulationReadyPubs = async () => {
    // Get today's date
    const today = new Date();

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Fetch records with has_vision_masks_added = true
    const { data, error } = await supabaseClient
      .from("pub")
      .select()
      .eq("has_vision_masks_added", true);

    if (error) throw error;

    // Filter records based on last_checked date
    return data.filter((pub) => {
      if (!pub.last_checked) return false;

      // Parse the date in DD-MM-YYYY format
      const [day, month, year] = pub.last_checked.split("-").map(Number);
      const lastCheckedDate = new Date(year, month - 1, day); // Month is 0-indexed in JS Date

      return lastCheckedDate < sevenDaysAgo;
    });
  };

  // Queries
  const GET_PUB_AREAS_QUERY_KEY = ["getPubAreas", selectedPubId];

  const GET_MASK_READY_PUBS_QUERY_KEY = ["getMaskReadyPubs"];

  const GET_SIMULATION_READY_PUBS_QUERY_KEY = ["getSimulationReadyPubs"];

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

  const { data: maskReadyPubs = [] } = useQuery({
    queryKey: GET_MASK_READY_PUBS_QUERY_KEY,
    queryFn: fetchMaskReadyPubs,
  });

  const { data: simulationReadyPubs = [] } = useQuery({
    queryKey: GET_SIMULATION_READY_PUBS_QUERY_KEY,
    queryFn: fetchSimulationReadyPubs,
  });

  // When areasForPub changes after selecting a pub, set selectedPubArea to the first area
  useEffect(() => {
    if (selectedPubId && areasForPub && areasForPub.length > 0) {
      updatePubAreasState({ selectedPubArea: areasForPub[0] });
    }
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

  //

  // Variables
  const currentSimulationPubIndex =
    simulationReadyPubs.findIndex((pub) => pub.id === selectedPub?.id) || 0;

  console.log("simulationReadyPubs", { simulationReadyPubs });

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

  const { mutate: setVisionMasksAdded } = useMutation({
    mutationFn: async ({ pub_id }: SetPubAreasPresentPayload) => {
      // Update floor area for the pub area
      const { data, error } = await supabaseClient
        .from("pub")
        .update({ has_vision_masks_added: true })
        .eq("id", pub_id);
      if (error) throw error;
      return data;
    },
  });

  const { mutate: saveVisionMask, isPending: isSavingVisionMask } = useMutation(
    {
      mutationFn: async ({
        pubAreaId,
        visionMaskPoints,
      }: SaveVisionMaskPayload) => {
        // Update floor area for the pub area
        const { data, error } = await supabaseClient
          .from("pub_area")
          .update({ vision_mask_points: visionMaskPoints })
          .eq("id", pubAreaId);
        if (error) throw error;
        return data;
      },
    }
  );

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

  const onSetSelectedPub = (pub: Pub | null) => {
    updatePubAreasState({
      selectedPubId: pub?.id || 0,
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

  const onGoToPreviousArea = () => {
    const indexOfCurrentPubArea = areasForPub.findIndex(
      (area) => area.id === selectedPubArea?.id
    );

    if (indexOfCurrentPubArea === -1) return;

    // If we're at the first pub area, go to the last
    if (indexOfCurrentPubArea === 0) {
      onSelectPubArea(areasForPub[areasForPub.length - 1]);
    } else {
      const previousPubArea = areasForPub[indexOfCurrentPubArea - 1];
      onSelectPubArea(previousPubArea);
    }
  };

  const onGoToNextArea = () => {
    const indexOfCurrentPubArea = areasForPub.findIndex(
      (area) => area.id === selectedPubArea?.id
    );

    if (indexOfCurrentPubArea === -1) return;

    // If we're at the last pub area, go back to the start
    if (indexOfCurrentPubArea === areasForPub.length - 1) {
      onSelectPubArea(areasForPub[0]);
    } else {
      const nextPubArea = areasForPub[indexOfCurrentPubArea + 1];
      onSelectPubArea(nextPubArea);
    }
  };

  const onSaveMask = (bagOfPoints: { x: number; y: number }[]) => {
    // Save the mask to the Supbase DB
    saveVisionMask(
      {
        pubAreaId: selectedPubArea?.id || 0,
        visionMaskPoints: bagOfPoints,
      },
      {
        onSuccess: () => {
          // Update the query client cache
          queryClient.setQueryData(
            GET_PUB_AREAS_QUERY_KEY,
            (oldData: PubArea[] | undefined) => {
              if (!oldData) return [];
              return oldData.map((area) =>
                area.id === selectedPubArea?.id
                  ? { ...area, vision_mask_points: bagOfPoints }
                  : area
              );
            }
          );

          onGoToNextArea();
        },
      }
    );
  };

  const onGoToNextPub = () => {
    //
    // Update the pub to show that it has been masked
    setVisionMasksAdded({ pub_id: selectedPubId as number });

    //
    // Go to the next pub in the maskReadyPubs list
    const indexOfCurrentPub = maskReadyPubs.findIndex(
      (pub) => pub.id === selectedPubId
    );

    const nextPub = maskReadyPubs[indexOfCurrentPub + 1];
    if (nextPub) {
      onSetSelectedPub(nextPub);
    }
  };

  const onSimulateNextPub = () => {
    //
    // Go to the next pub in the simulationReadyPubs list
    const indexOfCurrentPub =
      simulationReadyPubs.findIndex((pub) => pub.id === selectedPubId) || 0;

    const nextPub = simulationReadyPubs[indexOfCurrentPub + 1];
    if (nextPub) {
      onSetSelectedPub(nextPub);
    }
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
      isSavingVisionMask,

      // Pub
      selectedPub,

      // Areas
      areasForPub,
      areasOfTypes,
      allAvailableAreas,

      // Filters
      availableAreaTypes,

      // Simulation
      currentSimulationPubIndex,
      simulationReadyPubs,
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
      onGoToNextArea,
      onGoToPreviousArea,

      // Vision masks
      onSaveMask,
      onGoToNextPub,

      // Update DB
      onSavePubAreaDetails,
      onSaveFloorArea,
      onSetPubAreasPresentForPub,
      onSetPubAreasMeasuredForPub,

      // Simulation
      onSimulateNextPub,
    },
  };
};

export default usePubAreas;
