import { Filter, X } from "lucide-react";
import useFilters from "../../../../../_shared/hooks/filters/useFilters";

const OpenCloseFiltersButton = () => {
  //

  // Hooks
  const {
    data: { viewFilters },
    operations: { onToggleViewFilters },
  } = useFilters();

  //

  // Handlers
  const onToggleFilters = () => {
    onToggleViewFilters();
  };

  //

  // Render
  return (
    <button
      onClick={onToggleFilters}
      className="fixed flex flex-row items-center justify-center border-2 gap-2 w-26 top-[18px] right-2 rounded-[30px] bg-white p-3 border-slate-800 text-xs font-bold font-poppins z-[1000]"
    >
      {viewFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
      {viewFilters ? "Close" : "Filters"}
    </button>
  );
};

export default OpenCloseFiltersButton;
