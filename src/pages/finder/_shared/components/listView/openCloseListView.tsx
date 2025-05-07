import { List, X } from "lucide-react";

// Hooks
import useFilters from "../../../../../_shared/hooks/filters/useFilters";

const OpenCloseListViewButton = () => {
  //

  // Hooks
  const {
    data: { viewAsList },
    operations: { onToggleViewAsList },
  } = useFilters();

  //

  // Render
  return (
    <button
      onClick={onToggleViewAsList}
      className="fixed flex flex-row items-center justify-center border-2 gap-2 w-32 top-[66px] right-2 rounded-[30px] bg-white p-3 border-slate-800 text-xs font-bold font-poppins z-[1000]"
    >
      {viewAsList ? <X className="w-4 h-4" /> : <List className="w-4 h-4" />}
      {viewAsList ? "Close" : "List View"}
    </button>
  );
};

export default OpenCloseListViewButton;
