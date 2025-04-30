import { useState, useMemo } from "react";
import { ArrowUpDown, Check, Filter, Sun } from "lucide-react";

// Hooks
import usePubs from "../../finder/_shared/hooks/usePubs";
import usePubAreas from "../../areas/identifier/_shared/hooks/usePubAreas";

// Components
import ViewSelectedArea from "./selectedArea";
import AreaTableRow from "./selectedArea/areaTableRow";

// Types
import { PubArea } from "../../../_shared/types";

// Helpers
import { AREA_TYPES } from "../_shared";

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
    data: { areasOfTypes, selectedAreaTypes, selectedPubArea },
    operations: { onToggleAreaTypeFilter, onSelectPubArea },
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
    <div className="h-screen flex flex-col px-8 py-16">
      {selectedPubArea && (
        <div className="bg-white shadow-md rounded-xl p-6 w-[90vw] mx-auto mb-8">
          <ViewSelectedArea />
        </div>
      )}
      <div className="flex flex-col bg-none w-[90vw] mx-auto rounded-t-xl gap-6 mb-8">
        <div className="flex justify-between items-center text-white">
          <h1 className="text-5xl font-bold font-poppins">
            London's Sunniest Pub Areas
          </h1>
          <div className="flex items-center">
            <Filter className="mr-2" />
            <span className="">
              Filtered Areas: {areasOfTypes.length || "0"}
            </span>
          </div>
        </div>

        {/* Area Type Filters */}
        <div className="flex w-full">
          {AREA_TYPES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onToggleAreaTypeFilter(key)}
              className={`
                px-4 py-2 flex fle rounded-full text-sm font-medium transition-all duration-200 ease-in-out mr-2
                ${
                  selectedAreaTypes?.includes(key)
                    ? "bg-white text-blue-600 border-2 border-blue-600 hover:shadow-sm hover:opacity-60"
                    : "bg-none text-white border-2 border-white hover:shadow-sm hover:opacity-60"
                }
              `}
            >
              {selectedAreaTypes?.includes(key) ? (
                <Check className="mr-2" />
              ) : null}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Areas Table */}
      <div className="bg-white shadow-sm w-[90vw] mx-auto rounded-xl overflow-scroll">
        {areasOfTypes.length > 0 && (
          <table className="w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {[
                  { key: "pub_name", label: "Pub", width: "14%" },
                  { key: "name", label: "Name", width: "14%" },
                  { key: "type", label: "Type", width: "14%" },
                  { key: "description", label: "Description", width: "24%" },
                  { key: "floor_area", label: "Floor Area", width: "10%" },
                  { key: "latitude", label: "Latitude", width: "8%" },
                  { key: "longitude", label: "Longitude", width: "8%" },
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
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  style={{ width: "10%" }}
                >
                  <Sun className="h-4 w-4 text-amber-500" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAreas.map((area, index) => (
                <AreaTableRow
                  key={area.id || index}
                  area={area}
                  index={index}
                  selectedPubArea={selectedPubArea}
                  onSelectPubArea={onSelectPubArea}
                />
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
