import { useState, useMemo } from "react";
import { ArrowUpDown, Filter } from "lucide-react";

// Hooks
import usePubAreas from "../../area-identifier/_shared/hooks/usePubAreas";
import usePubs from "../../finder/_shared/hooks/usePubs";

// Types
import { PubArea } from "../../../_shared/types";

// Define the area types that can be filtered
export const AREA_TYPES = [
  { key: "pavement", label: "Pavement" },
  { key: "frontage-seating", label: "Frontage seating" },
  { key: "terrace", label: "Terrace" },
  { key: "terrace-waterfront", label: "Waterfront Terrace" },
  { key: "beer-garden", label: "Beer garden" },
  { key: "courtyard", label: "Courtyard" },
];

// Define a type for the sortable keys
type SortableKey = keyof Pick<
  PubArea & { pub_name: string },
  | "name"
  | "type"
  | "description"
  | "floor_area"
  | "latitude"
  | "longitude"
  | "pub_name"
>;

// Type for sort configuration
type SortConfig = {
  key: SortableKey;
  direction: "asc" | "desc";
};

const AreasList = () => {
  // Hooks
  const {
    data: { areasOfTypes, selectedAreaTypes },
    operations: { onToggleAreaTypeFilter },
  } = usePubAreas();

  const {
    data: { pubs = [] },
  } = usePubs();

  // Augment areas with pub details
  const areasWithPubDetails = useMemo(() => {
    return areasOfTypes.map((area) => {
      const pub = pubs.find((p) => p.id === area.pub_id);
      return {
        ...area,
        pub_name: pub?.name || "Unknown Pub",
      };
    });
  }, [areasOfTypes, pubs]);

  // State for sorting with proper typing
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "name",
    direction: "asc",
  });

  // Sorting function
  const sortedAreas = useMemo(() => {
    let sortableAreas = [...areasWithPubDetails];

    sortableAreas.sort((a, b) => {
      const valueA = a[sortConfig.key];
      const valueB = b[sortConfig.key];

      // Handle potential undefined values
      if (valueA == null) return sortConfig.direction === "asc" ? 1 : -1;
      if (valueB == null) return sortConfig.direction === "asc" ? -1 : 1;

      // Compare values
      if (valueA < valueB) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sortableAreas;
  }, [areasWithPubDetails, sortConfig]);

  // Sorting handler with typed parameter
  const handleSort = (key: SortableKey) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  // Render sorting icon
  const renderSortIcon = (key: SortableKey) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ArrowUpDown className="ml-2 h-4 w-4 inline text-blue-600" />
    ) : (
      <ArrowUpDown className="ml-2 h-4 w-4 inline rotate-180 text-blue-600" />
    );
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="px-4 sm:px-6 lg:px-8 py-4 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-extrabold text-gray-900">Pub Areas</h1>
          <div className="flex items-center">
            <Filter className="mr-2 text-gray-500" />
            <span className="text-gray-600">
              Filtered Areas: {areasOfTypes.length || "0"}
            </span>
          </div>
        </div>

        {/* Area Type Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          {AREA_TYPES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onToggleAreaTypeFilter(key)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ease-in-out
                ${
                  selectedAreaTypes?.includes(key)
                    ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-sm"
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Areas Table */}
      <div className="flex-grow overflow-auto">
        {areasOfTypes.length > 0 && (
          <table className="w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {[
                  { key: "pub_name", label: "Pub", width: "15%" },
                  { key: "name", label: "Name", width: "15%" },
                  { key: "type", label: "Type", width: "15%" },
                  { key: "description", label: "Description", width: "25%" },
                  { key: "floor_area", label: "Floor Area", width: "10%" },
                  { key: "latitude", label: "Latitude", width: "10%" },
                  { key: "longitude", label: "Longitude", width: "10%" },
                ].map(({ key, label, width }) => (
                  <th
                    key={key}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    style={{ width }}
                    onClick={() => handleSort(key as SortableKey)}
                  >
                    <div className="flex items-center">
                      {label}
                      {renderSortIcon(key as SortableKey)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAreas.map((area, index) => (
                <tr
                  key={area.id || index}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {[
                    area.pub_name,
                    area.name,
                    area.type,
                    area.description,
                    area.floor_area?.toFixed(2),
                    area.latitude?.toFixed(4),
                    area.longitude?.toFixed(4),
                  ].map((value, idx) => (
                    <td
                      key={idx}
                      className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 truncate"
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {areasOfTypes.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-xl text-gray-600">No areas found</p>
            <p className="text-sm text-gray-500 mt-2">
              Try adjusting your filters or check back later
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AreasList;
