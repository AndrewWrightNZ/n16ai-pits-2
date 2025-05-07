import { Filter, X } from "lucide-react";

// Hooks
import useFilters from "../../../../../_shared/hooks/filters/useFilters";

const OpenCloseFiltersButton = () => {
  //

  // Hooks
  const {
    data: { viewFilters, viewAsList },
    operations: { onToggleViewFilters, onToggleViewAsList },
  } = useFilters();

  //

  // Variables

  const showCloseButton = viewFilters || viewAsList;

  //

  // Handlers
  const handleClickToOpenOrCloseFilters = () => {
    if (viewAsList) {
      onToggleViewAsList();
    } else {
      onToggleViewFilters();
    }
  };

  //

  // Render
  return (
    <button
      onClick={handleClickToOpenOrCloseFilters}
      className="fixed flex flex-row items-center justify-center border-2 gap-2 w-26 top-[18px] right-2 rounded-[30px] bg-white p-3 border-slate-800 text-xs font-bold font-poppins z-[1000]"
    >
      {showCloseButton ? (
        <X className="w-4 h-4" />
      ) : (
        <Filter className="w-4 h-4" />
      )}
      {showCloseButton ? "Close" : "Filters"}
    </button>
  );
};

export default OpenCloseFiltersButton;
