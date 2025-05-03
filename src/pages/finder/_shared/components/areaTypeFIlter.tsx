import { useState, useRef, useEffect } from "react";

// Icons
import { Beer, Coffee, Umbrella, Home, Building, Waves } from "lucide-react";

// Hooks
import usePubAreas from "../../../areas/identifier/_shared/hooks/usePubAreas";

// Constants
import { formatAreaType } from "../../../lists/_shared";

// Components
import { AreaTypeFilterButton } from "./AreaTypeFilterButton";

interface AreaTypeFilterProps {}

const AreaTypeFilter: React.FC<AreaTypeFilterProps> = () => {
  // State for collapse/expand functionality
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hooks
  const {
    data: {
      availableAreaTypes = [],
      selectedAreaTypes = [],
      areasOfTypes = [],
    },
    operations: { onSelectAreaType },
  } = usePubAreas();

  // Get icon for area type
  const getIconForAreaType = (type: string) => {
    switch (type) {
      case "beer-garden":
        return <Beer size={20} color="#1d293d" />;
      case "terrace":
        return <Coffee size={20} color="#1d293d" />;
      case "pavement":
        return <Umbrella size={20} color="#1d293d" />;
      case "frontage-seating":
        return <Home size={20} color="#1d293d" />;
      case "courtyard":
        return <Building size={20} color="#1d293d" />;
      case "terrace-waterfront":
        return <Waves size={20} color="#1d293d" />;
      default:
        return <Umbrella size={20} color="#1d293d" />;
    }
  };

  // Collapse after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCollapsed(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Define filter objects
  const filters = availableAreaTypes.map((type) => ({
    id: type,
    label: formatAreaType(type),
    count: areasOfTypes.filter((area) => area.type === type).length,
    icon: getIconForAreaType(type),
  }));

  // Selected filters
  const selectedFilters = filters.filter((filter) =>
    selectedAreaTypes.includes(filter.id)
  );

  // If no filters are selected, show all filters
  const filtersToShow = selectedFilters.length > 0 ? selectedFilters : filters;

  // Calculate total count of displayed areas
  const totalDisplayedAreas = areasOfTypes.length;

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
              {totalDisplayedAreas > 0 ? totalDisplayedAreas + " areas" : ""}
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
