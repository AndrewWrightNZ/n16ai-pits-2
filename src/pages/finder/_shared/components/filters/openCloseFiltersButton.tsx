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
    <div className="fixed flex flex-row items-center gap-2 top-4 right-2 rounded-[30px] bg-[#2962FF] p-3 border-white border-2 z-[1000]">
      <button
        onClick={onToggleFilters}
        className="font-black text-white text-xs"
      >
        {viewFilters ? "Close" : "Open"}
      </button>
    </div>
  );
};

export default OpenCloseFiltersButton;
