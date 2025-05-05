// Context
import {
  AreaType,
  FiltersState,
  SunQuality,
  useFiltersContext,
} from "../../providers/FiltersProvider";

interface FiltersData extends FiltersState {}

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

  // Variables

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
