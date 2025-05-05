// Hooks
import useFilters from "../../../../../_shared/hooks/filters/useFilters";
import useHeroMetrics from "../../../../../_shared/hooks/heroMetrics/useHeroMetrics";

// Enums
import {
  AreaType,
  SunQuality,
} from "../../../../../_shared/providers/FiltersProvider";

// Helpers
import {
  formatSunQualityFilterOption,
  getSunPercentageFromOption,
} from "../../helpers";
import { formatAreaType } from "../../../../lists/_shared";

// Components
import DynamicSunIconWithBorder from "../../../../../_shared/components/DynamicSunIconWithBorder";
import { Check, Circle } from "lucide-react";

const SelectFilterOptions = () => {
  //

  // Hooks
  const {
    data: {
      sunQualityOptions = [],
      sunQualityFilters = [],
      areaTypeOptions = [],
      areaTypeFilters = [],
    },
    operations: { onSunQualityFilterClick, onAreaTypeFilterClick },
  } = useFilters();

  console.log("areaTypeOptions", { areaTypeOptions });

  const {
    data: {
      goodSunCount = 0,
      someSunCount = 0,
      noneSunCount = 0,
      allMapReadyAreas = [],
    },
  } = useHeroMetrics();

  // Calculate the number of pubs to show based on selected sun quality filters
  const numberOfPubsToShow = sunQualityFilters.reduce((total, option) => {
    if (option === SunQuality.GOOD) return total + goodSunCount;
    if (option === SunQuality.SOME) return total + someSunCount;
    if (option === SunQuality.NO) return total + noneSunCount;
    return total;
  }, 0);

  //

  // Render
  return (
    <div className="flex flex-col gap-2 pt-4">
      <p className="text-lg font-black font-poppins">Filter Pubs</p>

      <p className="text-xs font-bold mt-4">Sun Quality</p>

      <div className="flex flex-row items-center justify-start gap-2 flex-wrap">
        {sunQualityOptions.map((option) => {
          const isSelected = sunQualityFilters.includes(option);

          const count =
            option === "GOOD"
              ? goodSunCount
              : option === "SOME"
                ? someSunCount
                : noneSunCount;

          return (
            <button
              key={option}
              onClick={() => onSunQualityFilterClick(option)}
              className={`flex flex-row items-center transition-all rounded-[20px] duration-300 cursor-pointer justify-center gap-2 border-2 border-slate-800 p-2 ${isSelected ? "border-[#2962FF] opacity-100 " : "border-gray-100 opacity-30 cursor-not-allowed"}`}
            >
              <DynamicSunIconWithBorder
                sunPercent={getSunPercentageFromOption(option)}
                parentClassName="w-[25px] h-[25px]"
                childClassName="w-[15px] h-[15px]"
              />

              <p className="text-xs font-bold font-poppins">
                {formatSunQualityFilterOption(option)}
              </p>

              <p className="text-xs font-normal font-poppins">({count} Pubs)</p>
            </button>
          );
        })}
      </div>

      <p className="text-xs font-normal mt-2">
        Showing: {numberOfPubsToShow} Pubs
      </p>

      <p className="text-xs font-bold mt-4">Area Type</p>

      <div className="flex flex-row items-center justify-start gap-2 flex-wrap">
        {areaTypeOptions.map((option: AreaType) => {
          const isSelected = areaTypeFilters.includes(option);

          const count = allMapReadyAreas.filter(
            (area) => area.type === option
          ).length;

          return (
            <button
              key={option}
              onClick={() => onAreaTypeFilterClick(option)}
              className={`flex flex-row items-center transition-all rounded-[20px] duration-300 cursor-pointer justify-center gap-2 border-2 border-slate-800 p-2 ${isSelected ? "border-[#2962FF] opacity-100 " : "border-gray-100 opacity-30 cursor-not-allowed"}`}
            >
              {isSelected ? (
                <Check className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
              <p className="text-xs font-bold font-poppins">
                {formatAreaType(option)}
              </p>

              <p className="text-xs font-normal font-poppins">
                ({count} Areas)
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SelectFilterOptions;
