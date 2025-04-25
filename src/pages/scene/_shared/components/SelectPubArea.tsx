// Hooks
import usePubAreas from "../../../area-identifier/_shared/hooks/usePubAreas";

const SelectPubArea = () => {
  //

  // Hooks
  const {
    data: {
      // Loading
      isLoadingAreasForPub,
      isSettingPubAreasPresent,

      // Pub
      selectedPub,

      // Areas
      areasForPub = [],
    },
    operations: { onSetPubAreasPresentForPub, onSelectPubArea },
  } = usePubAreas();

  //

  // Variables
  const { has_areas_added = false } = selectedPub || {};

  return (
    <div className="absolute top-24 right-2 bg-black/70 text-white p-3 rounded z-20 w-64">
      <h3 className="text-sm font-bold mb-2 mt-4">
        Marked Pub Areas ({areasForPub?.length})
      </h3>

      {/* Pub Areas List */}
      <div className="max-h-48 overflow-y-auto">
        {isLoadingAreasForPub ? (
          <div className="text-xs text-gray-400">Loading pub areas...</div>
        ) : areasForPub.length === 0 ? (
          <div className="text-xs text-gray-400">No pub areas found</div>
        ) : (
          <>
            <ul className="space-y-2">
              {areasForPub.map((area) => (
                <li
                  key={area.id}
                  className={
                    "rounded p-2 text-xs cursor-pointer transition-colors bg-gray-800 hover:bg-gray-700"
                  }
                  onClick={() => onSelectPubArea(area)}
                >
                  <div className="font-bold">{area.name}</div>
                  <div className="text-gray-300">{area.description}</div>
                </li>
              ))}
            </ul>

            {!has_areas_added && (
              <button
                className="bg-green-600 w-full mt-4 hover:bg-green-700 text-white text-xs px-2 py-1 rounded disabled:opacity-50"
                onClick={onSetPubAreasPresentForPub}
                disabled={isSettingPubAreasPresent}
              >
                {isSettingPubAreasPresent
                  ? "Updating... "
                  : "Set PubAreas present"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SelectPubArea;
