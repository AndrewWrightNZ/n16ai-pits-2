import { useQuery } from "@tanstack/react-query";

// Context
import { SunEvalsState, useSunEvalsContext } from "../../providers/useSunEvals";
import { usePubAreasContext } from "../../../pages/areas/identifier/_shared/providers/PubAreasProvider";

// Types
import { SunEval } from "../../types";

// Hooks
import { supabaseClient } from "../../hooks/useSupabase";

interface SunEvalsData extends SunEvalsState {
  // Loading
  isLoadingSunEvalsForPubArea: boolean;
  isLoadingSunEvalsForTimeslot: boolean;

  // SunEvals
  sunEvalsForPubArea: SunEval[];
  sunEvalsForTimeslot: SunEval[];
}

interface SunEvalsOperations {}

interface SunEvalsResponse {
  data: SunEvalsData;
  operations: SunEvalsOperations;
}

const useSunEvals = (): SunEvalsResponse => {
  //

  // Context
  const { sunEvalsState } = useSunEvalsContext();
  const { pubAreasState } = usePubAreasContext();

  //

  // Variables
  const { selectedPubArea } = pubAreasState || {};

  const TIMESLOT_ID = 16;

  //

  // Mutations
  const GET_SUN_EVALS_FOR_PUB_AREA_QUERY_KEY = [
    "getSunEvalsForPubArea",
    selectedPubArea?.id,
  ];

  const GET_SUN_EVALS_FOR_TIMESLOT_QUERY_KEY = [
    "getSunEvalsForTimeslot",
    TIMESLOT_ID,
  ];

  //

  // Query functions
  const fetchSunEvalsForPubArea = async (): Promise<SunEval[]> => {
    // Fetch all available pub labels
    const { data, error } = await supabaseClient
      .from("sun_eval_reg")
      .select("*")
      .eq("area_id", selectedPubArea?.id);

    if (error) throw error;
    return data;
  };

  const fetchSunEvalsForTimeslot = async (): Promise<SunEval[]> => {
    // Fetch all available pub labels
    const { data, error } = await supabaseClient
      .from("sun_eval_reg")
      .select("*")
      .eq("time", TIMESLOT_ID);

    if (error) throw error;
    return data;
  };

  //

  // Queries
  const {
    data: sunEvalsForPubArea = [],
    isLoading: isLoadingSunEvalsForPubArea,
  } = useQuery({
    queryKey: GET_SUN_EVALS_FOR_PUB_AREA_QUERY_KEY,
    queryFn: fetchSunEvalsForPubArea,
  });

  const {
    data: sunEvalsForTimeslot = [],
    isLoading: isLoadingSunEvalsForTimeslot,
  } = useQuery({
    queryKey: GET_SUN_EVALS_FOR_TIMESLOT_QUERY_KEY,
    queryFn: fetchSunEvalsForTimeslot,
  });

  //

  // Handlers

  return {
    data: {
      ...sunEvalsState,

      // Loading
      isLoadingSunEvalsForPubArea,
      isLoadingSunEvalsForTimeslot,

      // Evals
      sunEvalsForPubArea,
      sunEvalsForTimeslot,
    },
    operations: {
      // Update
    },
  };
};

export default useSunEvals;
