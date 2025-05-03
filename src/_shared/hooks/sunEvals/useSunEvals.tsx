import { useQuery } from "@tanstack/react-query";

// Context
import { SunEvalsState, useSunEvalsContext } from "../../providers/useSunEvals";
import { usePubAreasContext } from "../../../pages/areas/identifier/_shared/providers/PubAreasProvider";

// Types
import { SunEval } from "../../types";

// Hooks
import { supabaseClient } from "../../hooks/useSupabase";
import { getCurrentTimeSlot } from "../../utils";

interface SunEvalsData extends SunEvalsState {
  // Loading
  isLoadingSunEvalsForPubArea: boolean;
  isLoadingSunEvalsForTimeslot: boolean;
  isLoadingSunEvalsForAllPubAreas: boolean;

  // SunEvals
  sunEvalsForPubArea: SunEval[];
  sunEvalsForTimeslot: SunEval[];
  sunEvalsForAllPubAreas: SunEval[];

  // Pub counts
  pubsAbove50Percent: number;
  pubsAbove75Percent: number;
  pubsBelow50Percent: number;
}

interface SunEvalsOperations {
  // Filters
  onSunQualityFilterClick: (filter: string) => void;

  // Updates
  onChangeSunEvalsState: (newState: Partial<SunEvalsState>) => void;
  onSeedCurrentTimeSlot: () => void;
}

interface SunEvalsResponse {
  data: SunEvalsData;
  operations: SunEvalsOperations;
}

const useSunEvals = (): SunEvalsResponse => {
  //

  // Context
  const { sunEvalsState, updateSunEvalsState } = useSunEvalsContext();
  const { pubAreasState } = usePubAreasContext();

  //

  // Variables
  const { selectedTimeslot, sunQualitySelected } = sunEvalsState || {};
  const { selectedPubArea, selectedPubId } = pubAreasState || {};

  //

  // Mutations
  const GET_SUN_EVALS_FOR_PUB_AREA_QUERY_KEY = [
    "getSunEvalsForPubArea",
    selectedPubArea?.id,
  ];

  const GET_SUN_EVALS_FOR_ALL_PUB_AREAS_QUERY_KEY = [
    "getSunEvalsForAllPubAreas",
    selectedPubId,
  ];

  const GET_SUN_EVALS_FOR_TIMESLOT_QUERY_KEY = [
    "getSunEvalsForTimeslot",
    selectedTimeslot,
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

  const fetchSunEvalsForAllPubAreas = async (): Promise<SunEval[]> => {
    // Fetch all available pub labels
    const { data, error } = await supabaseClient
      .from("sun_eval_reg")
      .select("*")
      .eq("pub_id", selectedPubId);

    if (error) throw error;
    return data;
  };

  const fetchSunEvalsForTimeslot = async (): Promise<SunEval[]> => {
    // Fetch all available pub labels
    const { data, error } = await supabaseClient
      .from("sun_eval_reg")
      .select("*")
      .eq("time", selectedTimeslot);

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
    data: sunEvalsForAllPubAreas = [],
    isLoading: isLoadingSunEvalsForAllPubAreas,
  } = useQuery({
    queryKey: GET_SUN_EVALS_FOR_ALL_PUB_AREAS_QUERY_KEY,
    queryFn: fetchSunEvalsForAllPubAreas,
  });

  const {
    data: sunEvalsForTimeslot = [],
    isLoading: isLoadingSunEvalsForTimeslot,
  } = useQuery({
    queryKey: GET_SUN_EVALS_FOR_TIMESLOT_QUERY_KEY,
    queryFn: fetchSunEvalsForTimeslot,
  });

  //

  // Variables

  // Create an array of pubs, with sun evals attached by pub_id
  const pubsWithSunEvals = sunEvalsForTimeslot.reduce(
    (acc, sunEval) => {
      if (!acc[sunEval.pub_id]) {
        acc[sunEval.pub_id] = [];
      }
      acc[sunEval.pub_id].push(sunEval);
      return acc;
    },
    {} as Record<string, SunEval[]>
  );

  // Convert the object to an array for easier iteration
  const pubsArray = Object.entries(pubsWithSunEvals).map(
    ([pubId, sunEvals]) => ({
      pubId,
      sunEvals,
    })
  );

  // Count pubs with at least one area where sun percentage is above thresholds
  const pubsAbove50Percent = pubsArray.filter((pub) =>
    pub.sunEvals.some((sunEval) => sunEval.pc_in_sun > 50)
  ).length;

  const pubsAbove75Percent = pubsArray.filter((pub) =>
    pub.sunEvals.some((sunEval) => sunEval.pc_in_sun > 75)
  ).length;

  const pubsBelow50Percent = pubsArray.filter((pub) =>
    pub.sunEvals.some((sunEval) => sunEval.pc_in_sun < 50)
  ).length;

  //

  // Handlers
  const onChangeSunEvalsState = (newState: Partial<SunEvalsState>) => {
    updateSunEvalsState(newState);
  };

  const onSeedCurrentTimeSlot = () => {
    const currentTimeSlot = getCurrentTimeSlot();
    onChangeSunEvalsState({ selectedTimeslot: currentTimeSlot });
  };

  const onSunQualityFilterClick = (filter: string) => {
    const alreadySelected = sunQualitySelected.includes(filter);
    onChangeSunEvalsState({
      sunQualitySelected: alreadySelected
        ? sunQualitySelected.filter((f) => f !== filter)
        : [...sunQualitySelected, filter],
    });
  };

  return {
    data: {
      ...sunEvalsState,

      // Loading
      isLoadingSunEvalsForPubArea,
      isLoadingSunEvalsForTimeslot,
      isLoadingSunEvalsForAllPubAreas,

      // Evals
      sunEvalsForPubArea,
      sunEvalsForTimeslot,
      sunEvalsForAllPubAreas,

      // Pub counts
      pubsAbove50Percent,
      pubsAbove75Percent,
      pubsBelow50Percent,
    },
    operations: {
      // Filters
      onSunQualityFilterClick,

      // Update
      onChangeSunEvalsState,
      onSeedCurrentTimeSlot,
    },
  };
};

export default useSunEvals;
