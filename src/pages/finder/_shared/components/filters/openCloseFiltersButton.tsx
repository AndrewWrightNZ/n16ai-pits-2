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
    <div className="fixed flex flex-row items-center gap-2 top-[18px] right-2 rounded-[30px] bg-white p-3 border-[#2962FF] border-2 z-[1000]">
      <button
        onClick={onToggleFilters}
        className="font-bold text-[#2962FF] text-xs flex flex-row items-center gap-2"
      >
        {viewFilters ? (
          <X className="w-4 h-4" />
        ) : (
          <Filter className="w-4 h-4" />
        )}
        {viewFilters ? "Close" : "Filters"}
      </button>
    </div>
  );
};

export default OpenCloseFiltersButton;
