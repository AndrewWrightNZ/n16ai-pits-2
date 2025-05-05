// Context
import {
  FiltersState,
  useFiltersContext,
} from "../../providers/FiltersProvider";

interface FiltersData extends FiltersState {}

interface FiltersOperations {
  onToggleViewFilters: () => void;
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

  return {
    data: {
      ...filtersState,
    },
    operations: {
      onToggleViewFilters,
    },
  };
};

export default useFilters;
