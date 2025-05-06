import { useQuery } from "@tanstack/react-query";

// Context
import { usePubAreasContext } from "../../providers/PubAreasProvider";
import { SunEvalsState, useSunEvalsContext } from "../../providers/useSunEvals";

// Types
import { SunEval } from "../../types";

// Hooks
import { supabaseClient } from "../../hooks/useSupabase";

// Helpers
import { getCurrentJulianWeek, getCurrentTimeSlot } from "../../utils";

interface SunEvalsData extends SunEvalsState {
  // Loading
  isLoadingSunEvalsForPubArea: boolean;
  isLoadingSunEvalsForTimeslot: boolean;
  isLoadingSunEvalsForAllPubAreas: boolean;

  // SunEvals
  sunEvalsForPubArea: SunEval[];
  sunEvalsForTimeslot: SunEval[];
  sunEvalsForAllPubAreas: SunEval[];
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

  const julianWeek = getCurrentJulianWeek();

  //

  // Mutations
  const GET_SUN_EVALS_FOR_PUB_AREA_QUERY_KEY = [
    "getSunEvalsForPubArea",
    selectedPubArea?.id,
    julianWeek,
  ];

  const GET_SUN_EVALS_FOR_ALL_PUB_AREAS_QUERY_KEY = [
    "getSunEvalsForAllPubAreas",
    selectedPubId,
    julianWeek,
  ];

  const GET_SUN_EVALS_FOR_TIMESLOT_QUERY_KEY = [
    "getSunEvalsForTimeslot",
    selectedTimeslot,
    julianWeek,
  ];

  //

  // Query functions
  const fetchSunEvalsForPubArea = async (): Promise<SunEval[]> => {
    // Fetch all available pub labels
    const { data, error } = await supabaseClient
      .from("sun_eval_reg")
      .select("*")
      .eq("area_id", selectedPubArea?.id)
      .eq("julian_week", julianWeek);

    if (error) throw error;
    return data;
  };

  const fetchSunEvalsForAllPubAreas = async (): Promise<SunEval[]> => {
    // Fetch all available pub labels
    const { data, error } = await supabaseClient
      .from("sun_eval_reg")
      .select("*")
      .eq("pub_id", selectedPubId)
      .eq("julian_week", julianWeek);

    if (error) throw error;
    return data;
  };

  const fetchSunEvalsForTimeslot = async (): Promise<SunEval[]> => {
    // Fetch all available pub labels
    const { data, error } = await supabaseClient
      .from("sun_eval_reg")
      .select("*")
      .eq("time", selectedTimeslot)
      .eq("julian_week", julianWeek);

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
