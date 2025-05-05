// Context
import {
  FiltersState,
  useFiltersContext,
} from "../../providers/FiltersProvider";

interface FiltersData extends FiltersState {}

interface FiltersOperations {
  onToggleViewFilters: () => void;
  onSunQualityFilterClick: (option: string) => void;
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

  const onSunQualityFilterClick = (option: string) => {
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

  return {
    data: {
      ...filtersState,
    },
    operations: {
      onToggleViewFilters,
      onSunQualityFilterClick,
    },
  };
};

export default useFilters;
