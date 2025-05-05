// Hooks
import useFilters from "../../../../../_shared/hooks/filters/useFilters";
import useHeroMetrics from "../../../../../_shared/hooks/heroMetrics/useHeroMetrics";

// Enums
import { AreaType } from "../../../../../_shared/providers/FiltersProvider";

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
      // Options
      sunQualityOptions = [],
      areaTypeOptions = [],

      // Filters
      sunQualityFilters = [],
      areaTypeFilters = [],

      // Pubs filtered by sun quality
      pubsToShowAfterFilteringBySunQuality = [],
      areaTypesToShowAfterFilteringBySunQuality = [],

      // Areas filtered by area type
      areaTypesToShowAfterFilteringByAreaType = [],
    },
    operations: { onSunQualityFilterClick, onAreaTypeFilterClick },
  } = useFilters();

  const {
    data: { goodSunCount = 0, someSunCount = 0, noneSunCount = 0 },
  } = useHeroMetrics();

  //

  // Variables

  const showingAllPubs = sunQualityFilters.length === sunQualityOptions.length;
  const showingAllAreas = areaTypeFilters.length === areaTypeOptions.length;

  //

  // Render
  return (
    <div className="flex flex-col gap-2 pt-4">
      <p className="text-lg font-black font-poppins">Filter Pubs</p>

      <div className="relative flex flex-col items-start justify-start h-[calc(75vh-70px)] overflow-y-auto pb-20">
        {/* Fade-out effect at the bottom */}
        <p className="text-xs font-bold mt-4 mb-4">Sun Quality</p>

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
                className={`flex flex-row items-center transition-all rounded-[20px] duration-300 cursor-pointer justify-center gap-2 border-2 p-2 ${isSelected ? "border-gray-800 opacity-100 " : "border-gray-600 opacity-30 cursor-not-allowed"}`}
              >
                <DynamicSunIconWithBorder
                  sunPercent={getSunPercentageFromOption(option)}
                  parentClassName="w-[25px] h-[25px]"
                  childClassName="w-[15px] h-[15px]"
                />

                <p className="text-xs font-bold font-poppins">
                  {formatSunQualityFilterOption(option)}
                </p>

                <p className="text-xs font-normal font-poppins">
                  ({count} Pubs)
                </p>
              </button>
            );
          })}
        </div>

        <p className="text-xs font-normal mt-2 mb-2">
          {showingAllPubs ? "Showing all Pubs" : "Filtered to: "}
          <strong>{pubsToShowAfterFilteringBySunQuality.length} pubs</strong>
        </p>

        <p className="text-xs font-bold mt-4 mb-4">Area Type</p>

        <div className="flex flex-row items-center justify-start gap-2 flex-wrap">
          {areaTypeOptions.map((option: AreaType) => {
            const isSelected = areaTypeFilters.includes(option);

            const areasForType =
              areaTypesToShowAfterFilteringBySunQuality.filter(
                ({ type }) => type === option
              );

            console.log({
              areasForType,
            });

            return (
              <button
                key={option}
                onClick={() => onAreaTypeFilterClick(option)}
                className={`flex flex-row items-center transition-all rounded-[20px] duration-300 cursor-pointer justify-center gap-2 border-2 p-3 ${isSelected ? "border-gray-800 opacity-100 " : "border-gray-600 opacity-30 cursor-not-allowed"}`}
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
                  ({areasForType.length} Areas)
                </p>
              </button>
            );
          })}
        </div>

        <p className="text-xs font-normal mt-2">
          {showingAllAreas ? (
            "Showing all Areas"
          ) : (
            <>
              Filtered to:{" "}
              <strong>
                {areaTypesToShowAfterFilteringByAreaType.length} areas
              </strong>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default SelectFilterOptions;
