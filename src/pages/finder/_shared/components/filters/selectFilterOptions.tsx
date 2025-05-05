import useFilters from "../../../../../_shared/hooks/filters/useFilters";

const SelectFilterOptions = () => {
  //

  // Hooks
  const {} = useFilters();
  return (
    <div className="flex flex-col gap-2">
      <p>Filter by sun quality</p>
    </div>
  );
};

export default SelectFilterOptions;
