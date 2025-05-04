import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

// Hooks
import { supabaseClient } from "../useSupabase";

// Contexts
import { usePubContext } from "../../providers/PubProvider";

// Types
import { Pub } from "../../types";
import { PubState } from "../../providers/PubProvider";

//

// Constants
const AVAILABLE_FILTERS = ["full_sun", "partial_sun", "no_sun"];

//

// Types
interface PubsData extends PubState {
  // Loading
  isLoading: boolean;
  isLoadingUIReadyPubs: boolean;

  // Pubs
  pubs: Pub[];
  uiReadyPubs: Pub[];
  pubsInMapBounds: Pub[];

  selectedPub: Pub | null;

  // Filters
  availableFilters: string[];
}

interface HookShape {
  data: PubsData;

  operations: {
    // Local state
    onSetSelectedPubId: (
      id: number,
      force?: boolean,
      autoPilot?: boolean
    ) => void;

    onSetHoveredPubId: (pubId: number) => void;

    // Filtering
    onSelectFilter: (newSelectedFilter: string) => void;

    // Map Bounds
    onSetMapBounds: (bounds: any) => void;

    // Queries
    onRefetchPubs: () => void;
  };
}

const usePubs = (): HookShape => {
  //

  // Contexts
  const { pubState, updatePubState } = usePubContext();

  const {
    selectedPubId = 0,
    hoveredPubId = 0,
    selectedFilters = [],

    // Map Bounds
    mapBounds = {
      north: 0,
      south: 0,
      east: -0,
      west: -0,
    },
  } = pubState;

  //

  // Query functions
  const fetchPubs = async () => {
    const { data, error } = await supabaseClient.from("pub").select();
    if (error) throw error;
    return data;
  };

  const fetchUIReadyPubs = async () => {
    //

    // Get pubs where the has_areas_measured is true
    const { data, error } = await supabaseClient
      .from("pub")
      .select()
      .eq("has_vision_masks_added", true);
    if (error) throw error;
    return data;
  };

  //

  // Queries
  const GET_PUBS_QUERY_KEY = ["pubs"];
  const GET_UI_READY_PUBS_QUERY_KEY = ["pubs", "ui-ready"];

  const {
    data: pubs = [],
    isLoading,
    refetch: onRefetchPubs,
  } = useQuery({
    queryKey: GET_PUBS_QUERY_KEY,
    queryFn: fetchPubs,
  });
  const { data: uiReadyPubs = [], isLoading: isLoadingUIReadyPubs } = useQuery({
    queryKey: GET_UI_READY_PUBS_QUERY_KEY,
    queryFn: fetchUIReadyPubs,
  });

  const selectedPub = uiReadyPubs.find((pub: Pub) => pub.id === selectedPubId);

  //

  // Variables
  const isAllDataLoaded = !isLoading;

  //

  // Filter by which pubs are in view
  const pubsInMapBounds = useMemo(() => {
    if (!isAllDataLoaded) return [];

    return uiReadyPubs.filter((pub: Pub) => {
      const { latitude, longitude } = pub;
      const { north, south, east, west } = mapBounds;

      return (
        latitude > south &&
        latitude < north &&
        longitude > west &&
        longitude < east
      );
    });
  }, [uiReadyPubs, mapBounds, isAllDataLoaded]);

  //

  // Handlers

  const onSetSelectedPubId = useCallback(
    (id: number, force?: boolean, autoPilot: boolean = false) => {
      if (selectedPubId === id && !force) {
        updatePubState({ selectedPubId: 0 });
      } else {
        updatePubState({ selectedPubId: id });

        const selectedPub = pubs.find((pub: Pub) => pub.id === id);
        const isDev = import.meta.env.DEV;

        if (!isDev && !autoPilot && selectedPub) {
          //   onSendSlackMessage({
          //     messageText: `🍻 ${selectedPub.name}, ${selectedPub.address_text} selected on Map - (${isMobile ? "M" : "D"})`,
          //     channelName: "pubs-in-the-sun",
          //   });
        }
      }
    },
    [selectedPubId, pubs, updatePubState]
  );

  const onSetHoveredPubId = useCallback(
    (pubId: number) => {
      updatePubState({ hoveredPubId: pubId === hoveredPubId ? 0 : pubId });
    },
    [hoveredPubId, updatePubState]
  );

  const onSelectFilter = (newSelectedFilter: string) => {
    // Check if we're adding or removing the filter
    const alreadySelected = selectedFilters.includes(newSelectedFilter);

    let newSelectedFilters: string[] = [];

    if (alreadySelected) {
      // Remove the filter
      newSelectedFilters = selectedFilters.filter(
        (filter) => filter !== newSelectedFilter
      );
    } else {
      // Add the filter
      newSelectedFilters = [...selectedFilters, newSelectedFilter];
    }

    updatePubState({ selectedFilters: newSelectedFilters });
  };

  //

  // Map Bounds
  const onSetMapBounds = (bounds: any) => {
    updatePubState({ mapBounds: bounds });
  };

  return {
    data: {
      ...pubState,

      // Loading
      isLoading,
      isLoadingUIReadyPubs,

      // Pubs
      pubs,
      uiReadyPubs,
      selectedPub,
      selectedPubId,
      hoveredPubId,

      pubsInMapBounds,

      // Map bounds
      mapBounds,

      // Filters
      selectedFilters,
      availableFilters: AVAILABLE_FILTERS,
    },
    operations: {
      // View
      onSetSelectedPubId,
      onSetHoveredPubId,

      // Filtering
      onSelectFilter,

      // Map Bounds
      onSetMapBounds,

      // Queries
      onRefetchPubs,
    },
  };
};

export default usePubs;
