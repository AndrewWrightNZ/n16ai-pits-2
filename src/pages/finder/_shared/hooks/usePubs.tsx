import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

// Hooks
// import useAnalytics from "../analytics/useAnalytics";
import { supabaseClient } from "../../../../_shared/hooks/useSupabase";

// Contexts
import { PubState, usePubContext } from "../providers/PubProvider";
import { Pub } from "../../../../_shared/types";

// Types
// import { GooglePlaceDetails } from "../../pages/admin/addNew/addressAutocomplete";

// Types
// import { Pub } from "../../types/pub";
// import { CameraPosition } from "../threeDScene/utils";

// Utils
// import * as fn from "../../../../_shared/utils";

// Types
// import { SunEvalReport, SunEvaluation } from "../../types/sunEvaluation";
// import theme from "../../theme";
// import { useMediaQuery } from "@mui/material";

//

// Constants

const AVAILABLE_FILTERS = ["full_sun", "partial_sun", "no_sun"];

//

// Types

interface PubsData extends PubState {
  // Loading
  isLoading: boolean;

  // Pubs
  pubs: Pub[];
  selectedPub: Pub | null;
  pubsInTheSun: Pub[];
  pubsPartiallyInTheSun: Pub[];
  pubsNotInTheSun: Pub[];

  // Counts
  pubsInTheSunCount: number;
  pubsPartiallyInTheSunCount: number;
  pubsNotInTheSunCount: number;

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

  //

  // Queries

  // Create a Date object
  //   const date = new Date();

  // Get time components
  //   const hours = date.getHours().toString().padStart(2, "0");
  //   const minutes = date.getMinutes().toString().padStart(2, "0");

  // Format time
  //   const rawCurrentTime = [hours, minutes];

  // Round up time
  //   const roundedUpCurrentTime = fn.roundUpCurrentTime(rawCurrentTime);

  // Format date
  //   const year = date.getFullYear();
  //   const month = (date.getMonth() + 1).toString().padStart(2, "0");
  //   const day = date.getDate().toString().padStart(2, "0");

  //   const HARDCODE_FOR_WINTER = true;

  //   const formattedCurrentDate = HARDCODE_FOR_WINTER
  //     ? "19-09-2024"
  //     : `${day}-${month}-${year}`;

  const GET_PUBS_QUERY_KEY = ["pubs"];

  const { data: pubs = [], isLoading } = useQuery({
    queryKey: GET_PUBS_QUERY_KEY,
    queryFn: fetchPubs,
  });

  const selectedPub = pubs.find((pub: Pub) => pub.id === selectedPubId);

  //

  // Variables
  const isAllDataLoaded = !isLoading;

  //

  // Get Counts of Pubs in the Sun
  const pubsInTheSunCount = useMemo(() => {
    if (!isAllDataLoaded) return 0;
    return pubs.length;
  }, [pubs, selectedFilters, isAllDataLoaded]);

  const pubsPartiallyInTheSunCount = useMemo(() => {
    if (!isAllDataLoaded) return 0;
    return pubs.length;
  }, [pubs, isAllDataLoaded]);

  const pubsNotInTheSunCount = useMemo(() => {
    if (!isAllDataLoaded) return 0;
    return pubs.length;
  }, [pubs, isAllDataLoaded]);

  //

  // Filter by which pubs are in view

  const pubsInMapBounds = useMemo(() => {
    if (!isAllDataLoaded) return [];

    return pubs.filter((pub: Pub) => {
      const { latitude, longitude } = pub;
      const { north, south, east, west } = mapBounds;

      return (
        latitude > south &&
        latitude < north &&
        longitude > west &&
        longitude < east
      );
    });
  }, [pubs, mapBounds, isAllDataLoaded]);

  const pubsInTheSun = useMemo(() => {
    if (!isAllDataLoaded) return [];
    return pubsInMapBounds;
  }, [pubsInMapBounds, isAllDataLoaded]);

  const pubsPartiallyInTheSun = useMemo(() => {
    if (!isAllDataLoaded) return [];
    return pubsInMapBounds;
  }, [pubsInMapBounds, isAllDataLoaded]);

  const pubsNotInTheSun = useMemo(() => {
    if (!isAllDataLoaded) return [];
    return pubsInMapBounds;
  }, [pubsInMapBounds, isAllDataLoaded]);

  //

  // Handlers

  const onSetSelectedPubId = useCallback(
    (id: number, force?: boolean, autoPilot: boolean = false) => {
      if (selectedPubId === id && !force) {
        updatePubState({ selectedPubId: 0 });
      } else {
        updatePubState({ selectedPubId: id });
        // setTimeout(() => {
        //   updateThreeDSceneState({ show3dMap: true });
        // }, 1000);

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

      // Pubs
      pubs,
      selectedPub,
      selectedPubId,
      hoveredPubId,

      pubsInTheSunCount,
      pubsPartiallyInTheSunCount,
      pubsNotInTheSunCount,

      pubsInTheSun,
      pubsPartiallyInTheSun,
      pubsNotInTheSun,

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
    },
  };
};

export default usePubs;
