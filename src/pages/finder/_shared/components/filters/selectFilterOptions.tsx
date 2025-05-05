import DynamicSunIconWithBorder from "../../../../../_shared/components/DynamicSunIconWithBorder";
import useFilters from "../../../../../_shared/hooks/filters/useFilters";

const getSunPercentageFromOption = (option: string) => {
  switch (option) {
    case "NONE":
      return 0;
    case "SOME":
      return 50;
    case "GOOD":
      return 75;
    default:
      return 0;
  }
};

const formatSunQualityFilterOption = (option: string) => {
  switch (option) {
    case "NONE":
      return "None";
    case "SOME":
      return "Some";
    case "GOOD":
      return "Good";
    default:
      return "None";
  }
};

const SelectFilterOptions = () => {
  //

  // Hooks
  const {
    data: { sunQualityOptions = [], sunQualityFilters = [] },
    operations: { onSunQualityFilterClick },
  } = useFilters();

  //

  // Render
  return (
    <div className="flex flex-col gap-2 pt-4">
      <p className="text-lg font-black font-poppins">Filter Pubs</p>

      <p className="text-xs font-bold mt-4">Sun Quality</p>

      <div className="flex flex-row items-center justify-start gap-2">
        {sunQualityOptions.map((option) => {
          const isSelected = sunQualityFilters.includes(option);

          return (
            <button
              key={option}
              onClick={() => onSunQualityFilterClick(option)}
              className={`flex flex-row items-center transition-all rounded-[20px] duration-300 cursor-pointer justify-center gap-2 border-2 border-slate-800 p-2 px-3 ${isSelected ? "border-[#2962FF] opacity-100 " : "border-gray-400 opacity-50 cursor-not-allowed"}`}
            >
              <DynamicSunIconWithBorder
                sunPercent={getSunPercentageFromOption(option)}
                parentClassName="w-[30px] h-[30px]"
                childClassName="w-[15px] h-[15px]"
              />

              <p className="text-sm font-bold font-poppins">
                {formatSunQualityFilterOption(option)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SelectFilterOptions;
