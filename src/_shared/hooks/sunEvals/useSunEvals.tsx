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

  // SunEvals
  sunEvalsForPubArea: SunEval[];
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

  console.log("selectedPubArea in evals hook -", { selectedPubArea });

  //

  // Mutations
  const GET_SUN_EVALS_FOR_PUB_AREA_QUERY_KEY = [
    "getSunEvalsForPubArea",
    selectedPubArea?.id,
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

  //

  // Queries
  const {
    data: sunEvalsForPubArea = [],
    isLoading: isLoadingSunEvalsForPubArea,
  } = useQuery({
    queryKey: GET_SUN_EVALS_FOR_PUB_AREA_QUERY_KEY,
    queryFn: fetchSunEvalsForPubArea,
  });

  //

  // Handlers

  return {
    data: {
      ...sunEvalsState,

      // Loading
      isLoadingSunEvalsForPubArea,

      // Evals
      sunEvalsForPubArea,
    },
    operations: {
      // Update
    },
  };
};

export default useSunEvals;
