import usePubAreas from "../../area-identifier/_shared/hooks/usePubAreas";

// Define the area types that can be filtered
export const AREA_TYPES = [
  { key: "pavement", label: "Pavement" },
  { key: "frontage-seating", label: "Frontage seating" },
  { key: "terrace", label: "Terrace" },
  { key: "terrace-waterfront", label: "Waterfront Terrace" },
  { key: "beer-garden", label: "Beer garden" },
  { key: "courtyard", label: "Courtyard" },
];

const AreasList = () => {
  // Hooks
  const {
    data: { areasOfTypes, selectedAreaTypes },
    operations: { onToggleAreaTypeFilter },
  } = usePubAreas();

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-bold">Pub Areas</h1>

      {/* Area Type Filters */}
      <div className="flex flex-wrap gap-2">
        {AREA_TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onToggleAreaTypeFilter(key)}
            className={`
              px-3 py-1 rounded-full text-sm 
              ${
                selectedAreaTypes?.includes(key)
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Areas List */}
      <div>
        <p className="mb-2">Filtered Pub Areas: {areasOfTypes.length || "0"}</p>

        {areasOfTypes.length > 0 && (
          <ul className="space-y-2">
            {areasOfTypes.map((area, index) => (
              <li
                key={area.id || index}
                className="border p-2 rounded bg-white shadow-sm"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{area.name}</span>
                  <span className="text-gray-500 text-sm">{area.type}</span>
                </div>
                {area.description && (
                  <p className="text-gray-600 text-sm mt-1">
                    {area.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AreasList;
