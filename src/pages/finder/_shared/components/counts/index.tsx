// Components
import { FilterButton } from "./FilterButton";
import { useEffect, useState, useRef } from "react";

// Hooks
import useSunEvals from "../../../../../_shared/hooks/sunEvals/useSunEvals";
import usePubAreas from "../../../../../_shared/hooks/pubAreas/usePubAreas";

const PubCounts = () => {
  // State for collapse/expand functionality
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hooks
  const {
    data: { sunQualitySelected = [] },
    operations: { onSunQualityFilterClick },
  } = useSunEvals();

  const {
    data: {
      pubsWithSunEvalAbove75,
      pubsWithSunEvalAbove50Below75,
      pubsWithoutSunEvalAbove50Percent,
    },
  } = usePubAreas();

  // Calculate total count of displayed pubs
  const totalDisplayedPubs =
    sunQualitySelected.length > 0
      ? sunQualitySelected.reduce((total, id) => {
          if (id === "good") return total + pubsWithSunEvalAbove75.length;
          if (id === "some")
            return total + pubsWithSunEvalAbove50Below75.length;
          if (id === "no")
            return total + pubsWithoutSunEvalAbove50Percent.length;
          return total;
        }, 0)
      : pubsWithSunEvalAbove75.length +
        pubsWithSunEvalAbove50Below75.length +
        pubsWithoutSunEvalAbove50Percent.length;

  // Filter definitions
  const filters = [
    {
      id: "good",
      label: "Good Sun",
      count: pubsWithSunEvalAbove75.length,
      icon: <div className="w-[20px] h-[20px] bg-[#FFCC00] rounded-full" />,
    },
    {
      id: "some",
      label: "Some Sun",
      count: pubsWithSunEvalAbove50Below75.length,
      icon: (
        <div
          className="w-[20px] h-[20px] rounded-full"
          style={{
            background: "linear-gradient(to right, #FFCC00 50%, #99a1af 50%)",
            transform: "rotate(45deg)",
          }}
        />
      ),
    },
    {
      id: "no",
      label: "No Sun",
      count: pubsWithoutSunEvalAbove50Percent.length,
      icon: <div className="w-[20px] h-[20px] bg-[#99a1af] rounded-full" />,
    },
  ];

  // Collapse after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCollapsed(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Selected filters
  const selectedFilters = filters.filter((filter) =>
    sunQualitySelected.includes(filter.id)
  );

  // If no filters are selected, show all filters
  const filtersToShow = selectedFilters.length > 0 ? selectedFilters : filters;

  return (
    <div
      ref={containerRef}
      className={`flex flex-row items-center justify-end fixed top-[20px] right-[8px] transition-all duration-300 bg-none ${isCollapsed ? "hover-trigger" : ""}`}
      onMouseEnter={() => isCollapsed && setIsCollapsed(false)}
      onMouseLeave={() => setTimeout(() => setIsCollapsed(true), 1000)}
    >
      {isCollapsed ? (
        <div className="flex items-center bg-white rounded-[30px] border-2 border-slate-800 p-3 gap-2">
          <div className="flex gap-1">
            {filtersToShow.map((filter) => (
              <div key={filter.id} className="flex items-center">
                {filter.icon}
              </div>
            ))}
          </div>
          <p
            className={`font-bold text-xs text-slate-800 w-[50px] opacity-100 transition-opacity duration-500 ${totalDisplayedPubs > 0 ? "opacity-100" : "opacity-0"}`}
          >
            {totalDisplayedPubs > 0 ? totalDisplayedPubs + " pubs" : ""}
          </p>
        </div>
      ) : (
        <div className="flex flex-row gap-4">
          {filters.map((filter) => (
            <FilterButton
              key={filter.id}
              id={filter.id}
              label={filter.label}
              count={filter.count}
              isSelected={sunQualitySelected.includes(filter.id)}
              onClick={onSunQualityFilterClick}
              icon={filter.icon}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PubCounts;
