import { useState, useRef, useEffect } from "react";

// Hooks

// Constants
import { AREA_TYPES } from "../../../lists/_shared";

// Components
import { AreaTypeFilterButton } from "./AreaTypeFilterButton";
import { getIconForAreaType } from "../helpers";
import usePubAreas from "../../../../_shared/hooks/pubAreas/usePubAreas";
import useMapMarkers from "../../../../_shared/hooks/mapMarkers/useMapMarkers";

interface AreaTypeFilterProps {}

const AreaTypeFilter: React.FC<AreaTypeFilterProps> = () => {
  // State for collapse/expand functionality
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hooks
  const {
    data: { selectedAreaTypes = [] },
    operations: { onSelectAreaType },
  } = usePubAreas();

  const {
    data: { totalAreasInView = [] },
  } = useMapMarkers();

  // Collapse after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCollapsed(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Define filter objects
  const filters = AREA_TYPES.map(({ key, label }) => ({
    id: key,
    label: label,
    count: totalAreasInView.filter((area) => area.type === key).length,
    icon: getIconForAreaType(key),
  }));

  // Selected filters
  const selectedFilters = filters.filter((filter) =>
    selectedAreaTypes.includes(filter.id)
  );

  // If no filters are selected, show all filters
  const filtersToShow = selectedFilters.length > 0 ? selectedFilters : filters;

  // Calculate total count of displayed areas
  let totalDisplayedAreas = 0;

  for (const filter of filtersToShow) {
    totalDisplayedAreas += filter.count;
  }

  return (
    <div
      ref={containerRef}
      className={`fixed top-[80px] right-[8px] transition-all duration-300`}
      onMouseEnter={() => isCollapsed && setIsCollapsed(false)}
      onMouseLeave={() => setTimeout(() => setIsCollapsed(true), 1000)}
    >
      <div className="flex flex-row items-center justify-end">
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
              className={`font-bold text-xs text-slate-800 w-[60px] opacity-100 transition-opacity duration-500 ${totalDisplayedAreas > 0 ? "opacity-100" : "opacity-0"}`}
            >
              {totalDisplayedAreas > 0
                ? totalDisplayedAreas + " areas"
                : "All types"}
            </p>
          </div>
        ) : (
          <div className="flex flex-row gap-4">
            {filters.map((filter) => (
              <AreaTypeFilterButton
                key={filter.id}
                id={filter.id}
                label={filter.label}
                count={filter.count}
                isSelected={selectedAreaTypes.includes(filter.id)}
                onClick={onSelectAreaType}
                icon={filter.icon}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AreaTypeFilter;
