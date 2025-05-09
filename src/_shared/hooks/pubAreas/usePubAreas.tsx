import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Types
import { Pub, PubArea, SimpleCameraPosition, SunEval } from "../../types";

// Context
import {
  PubAreasState,
  usePubAreasContext,
} from "../../providers/PubAreasProvider";

import { useSupabase } from "../../../_shared/hooks/useSupabase";
import useCommunications from "../communication/useCommunication";

// Hooks
import usePubs from "../pubs/usePubs";
import useDeviceDetect from "../useDeviceDetect";
import { getCurrentJulianWeek } from "../../utils";

// Interfaces
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

export interface PubAreaWithSunEval extends PubArea {
  sunEval: SunEval;
}

export interface PubWithAreaAndSunEval {
  pub: Pub;
  groupedSunEvals: (SunEval & { pubArea: PubArea })[];
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

  // Selected pub
  selectedPub: Pub | null;

  // Areas
  areasForPub: PubArea[];
  allAvailableAreas: PubArea[];

  // Simulation
  currentSimulationPubIndex: number;
  simulationReadyPubs: Pub[];
}

interface PubAreasOperations {
  // Select pub
  onSetSelectedPub: (pub: Pub | null) => void;
  onSetSelectedPubById: (pubId: number) => void;

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
  const { client: supabaseAuthClient } = useSupabase();

  //

  // Context
  const { pubAreasState, updatePubAreasState } = usePubAreasContext();

  //

  // Hooks
  const {
    operations: { onSendSlackMessage },
  } = useCommunications();

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

  //

  // Query functions
  const fetchAreasForPub = async (): Promise<PubArea[]> => {
    // Fetch where pubId is selectedPubId and the date is today
    const { data, error } = await supabaseAuthClient
      .from("pub_area")
      .select()
      .eq("pub_id", selectedPubId);

    if (error) throw error;
    return data;
  };

  const fetchAllAvailableAreas = async (): Promise<PubArea[]> => {
    // Fetch all available pub areas
    const { data, error } = await supabaseAuthClient.from("pub_area").select();

    if (error) throw error;
    return data;
  };

  // Query functions
  const fetchPubById = async () => {
    const { data, error } = await supabaseAuthClient
      .from("pub")
      .select("*")
      .eq("id", selectedPubId);

    if (error) throw new Error(error.message);
    return data?.[0] as Pub;
  };

  const fetchMaskReadyPubs = async () => {
    // Get pubs where the has_areas_measured is true
    const { data, error } = await supabaseAuthClient
      .from("pub")
      .select()
      // has areas measured but doesn't have vision mask
      .eq("has_areas_measured", true)
      .is("has_vision_masks_added", null);
    if (error) throw error;
    return data;
  };

  const fetchSimulationReadyPubs = async () => {
    const currentJulianWeek = getCurrentJulianWeek();

    // Fetch records with has_vision_masks_added = true and (last_processed_julian_week less than current week OR null)
    const { data, error } = await supabaseAuthClient
      .from("pub")
      .select()
      .eq("has_vision_masks_added", true)
      .or(
        `last_processed_julian_week.lt.${currentJulianWeek},last_processed_julian_week.is.null`
      );

    if (error) throw error;

    return data;
  };

  // Queries
  const GET_PUB_AREAS_QUERY_KEY = ["getPubAreas", selectedPubId];

  const GET_MASK_READY_PUBS_QUERY_KEY = ["getMaskReadyPubs"];

  const GET_SIMULATION_READY_PUBS_QUERY_KEY = ["getSimulationReadyPubs"];

  const GET_PUB_BY_ID_QUERY_KEY = ["pubById", selectedPubId];
  const GET_ALL_AVAILABLE_AREAS_QUERY_KEY = ["getAllAvailableAreas"];

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

  // Internal hooks

  const {
    data: { uiReadyPubs = [], pubs: allPubs = [] },
  } = usePubs();
  const { isMobile } = useDeviceDetect();

  //

  // Variables
  const currentSimulationPubIndex =
    simulationReadyPubs.findIndex((pub: Pub) => pub.id === selectedPub?.id) ||
    0;

  //

  // Mutations
  const { mutate: saveNewPubArea, isPending: isSavingNewPubArea } = useMutation(
    {
      mutationFn: async ({ draftPubArea }: CreateNewPubAreaProps) => {
        const id = Date.now();

        const { data, error } = await supabaseAuthClient
          .from("pub_area")
          .insert([
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
      const { data, error } = await supabaseAuthClient
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
        // First verify the pub exists
        const { data: pubData, error: pubError } = await supabaseAuthClient
          .from("pub")
          .select("*")
          .eq("id", pub_id)
          .single();

        if (pubError) {
          console.error("Error finding pub:", pubError);
          throw pubError;
        }

        if (!pubData) {
          const notFoundError = new Error(`Pub with ID ${pub_id} not found`);
          console.error(notFoundError);
          throw notFoundError;
        }

        // Update the pub record
        const { data, error } = await supabaseAuthClient
          .from("pub")
          .update({ has_areas_added: true })
          .eq("id", pub_id)
          .select()
          .single(); // Use single() to get the object instead of an array

        if (error) {
          console.error("Error setting pub areas present: ", error);
          throw error;
        }

        return data;
      },
    });

  const { mutate: setPubAreasMeasured, isPending: isSettingPubAreasMeasured } =
    useMutation({
      mutationFn: async ({ pub_id }: SetPubAreasPresentPayload) => {
        // Update floor area for the pub area
        const { data, error } = await supabaseAuthClient
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
      const { data, error } = await supabaseAuthClient
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
        const { data, error } = await supabaseAuthClient
          .from("pub_area")
          .update({ vision_mask_points: visionMaskPoints })
          .eq("id", pubAreaId);
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
    if (!selectedPubId) {
      console.error("Cannot set pub areas present: No pub selected");
      return;
    }

    setPubAreasPresent(
      {
        pub_id: selectedPubId,
      },
      {
        onSuccess: (data) => {
          // Manually update the query
          if (data) {
            // Update the cache with the returned data
            queryClient.setQueryData(
              ["pub", selectedPubId],
              (oldData: Pub | undefined) => {
                if (!oldData) return data;
                return { ...oldData, has_areas_added: true };
              }
            );
          }

          onRefetchSelectedPub();

          // Get the next pub which needs areas added
          const pubsNeedingAreasAdded = allPubs.filter(
            ({ has_areas_added }) => !has_areas_added
          );

          // Set the next pub as selected
          if (pubsNeedingAreasAdded.length > 0) {
            const indexOfCurrentPub = pubsNeedingAreasAdded.findIndex(
              ({ id }) => id === selectedPubId
            );

            const nextPub = pubsNeedingAreasAdded[indexOfCurrentPub + 1];
            onSetSelectedPub(nextPub);
          }

          // Refetch the 'pubs' query
          queryClient.refetchQueries({
            queryKey: ["pubs"],
          });
        },
        onError: (error) => {
          console.error("Error setting pub areas present: ", error);
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

  const onSetSelectedPubById = (pubId: number) => {
    updatePubAreasState({
      selectedPubId: pubId,
      name: "",
      description: "",
      type: "",
    });

    const selectedPub = uiReadyPubs.find(({ id }) => id === pubId);

    const { name = "", address_text = "" } = selectedPub || {};

    //

    // Ping slack
    onSendSlackMessage({
      channelName: "azul-usage",
      messageText: `:beers: ${name} - ${address_text} selected on Map ${isMobile ? "(Mobile)" : "(Desktop)"}`,
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
      (pub: Pub) => pub.id === selectedPubId
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
      simulationReadyPubs.findIndex((pub: Pub) => pub.id === selectedPubId) ||
      0;

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
      isSavingVisionMask,

      // Pub
      selectedPub,

      // Areas
      areasForPub,
      allAvailableAreas,

      // Simulation
      currentSimulationPubIndex,
      simulationReadyPubs,
    },
    operations: {
      // Select pub
      onSetSelectedPub,
      onSetSelectedPubById,

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
