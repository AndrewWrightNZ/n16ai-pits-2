// Context
import {
  AreaType,
  FiltersState,
  SunQuality,
  useFiltersContext,
} from "../../providers/FiltersProvider";
import { PubArea } from "../../types";

// Hooks
import useHeroMetrics from "../heroMetrics/useHeroMetrics";

// Types
import { MapReadyMarker } from "../mapMarkers/useMapMarkers";

interface FiltersData extends FiltersState {
  // Pubs to show
  pubsToShowAfterFilteringBySunQuality: MapReadyMarker[];

  // Area types to show
  areaTypesToShowAfterFilteringBySunQuality: PubArea[];
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

  //

  // Variables
  const { sunQualityFilters = [] } = filtersState || {};

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
  const areaTypesToShowAfterFilteringBySunQuality = allMapReadyAreas.filter(
    (area) =>
      pubsToShowAfterFilteringBySunQuality.some(
        (pub) => pub.pub.id === area.pub_id
      )
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
