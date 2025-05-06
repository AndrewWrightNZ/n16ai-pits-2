// Context
import {
  AreaType,
  FiltersState,
  SunQuality,
  useFiltersContext,
} from "../../providers/FiltersProvider";

// Hooks
import useHeroMetrics from "../heroMetrics/useHeroMetrics";

// Types
import {
  MapReadyMarker,
  SimplePubAreaWithSunPc,
  SUN_THRESHOLDS,
} from "../mapMarkers/useMapMarkers";
import useSunEvals from "../sunEvals/useSunEvals";

interface FiltersData extends FiltersState {
  // Pubs to show
  pubsToShowAfterFilteringBySunQuality: MapReadyMarker[];

  // Area types to show
  areaTypesToShowAfterFilteringBySunQuality: SimplePubAreaWithSunPc[];
  areaTypesToShowAfterFilteringByAreaType: SimplePubAreaWithSunPc[];
}

interface FiltersOperations {
  // View
  onToggleViewFilters: () => void;

  // Select
  onSunQualityFilterClick: (option: SunQuality) => void;
  onAreaTypeFilterClick: (option: AreaType) => void;
}

interface FiltersResponse {
  data: FiltersData;
  operations: FiltersOperations;
}

const useFilters = (): FiltersResponse => {
  //

  // Context
  const { filtersState, updateFiltersState } = useFiltersContext();

  //

  // Hooks
  const {
    data: {
      rawGoodSunPubs = [],
      rawSomeSunPubs = [],
      rawNoneSunPubs = [],
      allMapReadyAreas = [],
    },
  } = useHeroMetrics();

  const { data: { sunEvalsForTimeslot = [] } = {} } = useSunEvals();

  //

  // Variables
  const { sunQualityFilters = [], areaTypeFilters = [] } = filtersState || {};

  const pubsToShowAfterFilteringBySunQuality = sunQualityFilters.reduce(
    (acc: MapReadyMarker[], option: SunQuality) => {
      if (option === SunQuality.GOOD) return [...acc, ...rawGoodSunPubs];
      if (option === SunQuality.SOME) return [...acc, ...rawSomeSunPubs];
      if (option === SunQuality.NO) return [...acc, ...rawNoneSunPubs];
      return acc;
    },
    []
  );

  // Filter to ensure the area is linked to one of these pubs: pubsToShowAfterFilteringBySunQuality
  const sunEvalLookup = Object.fromEntries(
    sunEvalsForTimeslot.map((sunEval) => [
      sunEval.area_id,
      sunEval.pc_in_sun || 0,
    ])
  );

  const pubAreas = allMapReadyAreas.map((area) => ({
    id: area.id,
    type: area.type,
    pc_in_sun: sunEvalLookup[area.id] || 0,
    floor_area: area.floor_area,
    pub_id: area.pub_id,
  }));

  const areaTypesToShowAfterFilteringBySunQuality = pubAreas.filter((area) => {
    // If no sun quality filters are selected, show all areas
    if (sunQualityFilters.length === 0) return true;

    // Check if the area meets the sun quality thresholds for the selected filters
    const meetsThreshold = sunQualityFilters.some((quality) => {
      if (quality === SunQuality.GOOD)
        return area.pc_in_sun >= SUN_THRESHOLDS.GOOD;
      if (quality === SunQuality.SOME)
        return area.pc_in_sun >= SUN_THRESHOLDS.SOME;
      if (quality === SunQuality.NO)
        return area.pc_in_sun < SUN_THRESHOLDS.SOME;
      return false;
    });

    // Check if the area belongs to a pub that passes the sun quality filter
    const belongsToFilteredPub = pubsToShowAfterFilteringBySunQuality.some(
      (pub) => pub.pub.id === area.pub_id
    );

    // Area must meet both conditions: sun quality threshold and belong to filtered pub
    return meetsThreshold && belongsToFilteredPub;
  });

  const areaTypesToShowAfterFilteringByAreaType =
    areaTypesToShowAfterFilteringBySunQuality.filter(({ type }) =>
      areaTypeFilters.includes(type as AreaType)
    );

  //

  // Handlers

  const onToggleViewFilters = () => {
    updateFiltersState({ viewFilters: !filtersState.viewFilters });
  };

  const onSunQualityFilterClick = (option: SunQuality) => {
    const isAlreadySelected = filtersState.sunQualityFilters.includes(option);

    if (isAlreadySelected) {
      updateFiltersState({
        sunQualityFilters: filtersState.sunQualityFilters.filter(
          (filter) => filter !== option
        ),
      });
    } else {
      updateFiltersState({
        sunQualityFilters: [...filtersState.sunQualityFilters, option],
      });
    }
  };

  const onAreaTypeFilterClick = (option: AreaType) => {
    const isAlreadySelected = filtersState.areaTypeFilters.includes(option);

    if (isAlreadySelected) {
      updateFiltersState({
        areaTypeFilters: filtersState.areaTypeFilters.filter(
          (filter) => filter !== option
        ),
      });
    } else {
      updateFiltersState({
        areaTypeFilters: [...filtersState.areaTypeFilters, option],
      });
    }
  };

  return {
    data: {
      ...filtersState,

      // Pubs to show after filtering by sun quality
      pubsToShowAfterFilteringBySunQuality,

      // Area types to show after filtering by sun quality
      areaTypesToShowAfterFilteringBySunQuality,
      areaTypesToShowAfterFilteringByAreaType,
    },
    operations: {
      // View
      onToggleViewFilters,

      // Select
      onSunQualityFilterClick,
      onAreaTypeFilterClick,
    },
  };
};

export default useFilters;
