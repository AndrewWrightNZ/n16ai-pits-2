import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

// Hooks
import { useSupabase } from "../useSupabase";

// Contexts
import { PubState } from "../../providers/PubProvider";
import { usePubContext } from "../../providers/PubProvider";

// Types
import { Pub } from "../../types";
import { getCurrentJulianWeek } from "../../utils";
import useCommunications from "../communication/useCommunication";

//

// Constants
const AVAILABLE_FILTERS = ["full_sun", "partial_sun", "no_sun"];

//

// Types
interface DraftPubOutline {
  name: string;
  address_text: string;
  latitude: number;
  longitude: number;
  user_submitted: boolean;
}

interface PubsData extends PubState {
  // Loading
  isLoading: boolean;
  isLoadingUIReadyPubs: boolean;

  // Pubs
  pubs: Pub[];
  uiReadyPubs: Pub[];
  pubsInMapBounds: Pub[];

  pubsProcessedThisJulianWeek: Pub[];

  // Filters
  availableFilters: string[];
}

interface HookShape {
  data: PubsData;

  operations: {
    // Map Bounds
    onSetMapBounds: (bounds: any) => void;

    // Queries
    onRefetchPubs: () => void;

    // Svae new pub
    onSaveNewPub: (pub: DraftPubOutline) => void;
  };
}

const usePubs = (): HookShape => {
  //

  // Contexts
  const { pubState, updatePubState } = usePubContext();

  //

  // Hooks
  const { client: supabaseClient } = useSupabase();
  const {
    operations: { onSendSlackMessage },
  } = useCommunications();

  //

  // Query functions
  const fetchPubs = async () => {
    try {
      // Use the Supabase client directly
      const { data, error } = await supabaseClient.from("pub").select("*");

      if (error) {
        console.error("Error fetching pubs:", error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error("Exception in fetchPubs:", e);
      return [];
    }
  };

  const fetchUIReadyPubs = async () => {
    try {
      // Get pubs where the has_vision_masks_added is true
      const { data, error } = await supabaseClient
        .from("pub")
        .select("*")
        .eq("has_vision_masks_added", true);

      if (error) {
        console.error("Error fetching UI ready pubs:", error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error("Exception in fetchUIReadyPubs:", e);
      return [];
    }
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

  const { mutate: handleSaveNewPub } = useMutation({
    mutationFn: async (draftPubOutline: DraftPubOutline) => {
      const { data, error } = await supabaseClient
        .from("pub")
        .insert([draftPubOutline]);
      if (error) {
        console.error("Error saving new pub:", error);
        throw error;
      }
      return data;
    },
  });

  //

  // Variables
  const isAllDataLoaded = !isLoading;

  const currentJulianWeek = getCurrentJulianWeek();

  const {
    // Map Bounds
    mapBounds = {
      north: 0,
      south: 0,
      east: -0,
      west: -0,
    },
  } = pubState;

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

  const pubsProcessedThisJulianWeek = uiReadyPubs.filter((pub: Pub) => {
    const { last_processed_julian_week } = pub;
    return last_processed_julian_week === currentJulianWeek;
  });

  //

  // Map Bounds
  const onSetMapBounds = (bounds: any) => {
    updatePubState({ mapBounds: bounds });
  };

  const onSaveNewPub = (draftPubOutline: DraftPubOutline) => {
    handleSaveNewPub(
      { ...draftPubOutline },
      {
        onSuccess: () => {
          onRefetchPubs();

          const { name = "", address_text = "" } = draftPubOutline;

          // Include more place details if available
          let messageText = `:mailbox_with_mail: New pub to set up: ${name}`;

          if (address_text) {
            messageText += ` (${address_text})`;
          }

          onSendSlackMessage({
            messageText,
            channelName: "azul-pubs-to-add",
          });
        },
      }
    );
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

      pubsInMapBounds,

      pubsProcessedThisJulianWeek,

      // Map bounds
      mapBounds,

      // Filters
      availableFilters: AVAILABLE_FILTERS,
    },
    operations: {
      // Map Bounds
      onSetMapBounds,

      // Queries
      onRefetchPubs,

      // Save new pub
      onSaveNewPub,
    },
  };
};

export default usePubs;
