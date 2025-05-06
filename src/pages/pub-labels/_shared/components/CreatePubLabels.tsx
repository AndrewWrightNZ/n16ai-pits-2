import { useEffect, useState } from "react";
// Hooks
import usePubLabels from "../hooks/usePubLabels";

// Types
import { PubArea, PubLabel } from "../../../../_shared/types";
import usePubAreas from "../../../../_shared/hooks/pubAreas/usePubAreas";

interface CreatePubLabelsProps {
  tilesSceneRef: React.RefObject<any>;
}

const CreatePubLabels = ({ tilesSceneRef }: CreatePubLabelsProps) => {
  //
  // State
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null);
  const [newLabel, setNewLabel] = useState({
    name: "",
    description: "",
    type: "visual", // Default value
  });

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
  } = usePubAreas();

  const {
    data: {
      // Loading
      isSettingPubLabelsAdded,
      isCreatingPubLabel,

      // Labels
      availablePubLabels = [],
      pubLabels = [],
    },
    operations: {
      // Update DB
      onSetPubLabelsAdded,
      onCreatePubLabel,
      onAddLabelToPub,
    },
  } = usePubLabels();

  //

  // Variables
  const { has_labels_added = false, id: pubId } = selectedPub || {};

  // Filter labels based on search term
  const filteredLabels = availablePubLabels.filter(
    (label) =>
      label.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      label.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      label.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get already added labels to pub
  const addedLabelIds = new Set(pubLabels.map((label) => label.id));

  //

  // Handlers
  const handleViewPubArea = (pubArea: PubArea) => {
    if (!tilesSceneRef.current || !pubArea.camera_position) return;

    // Set the camera position and target from the pub area
    const { position, target } = pubArea.camera_position;

    // Use the tilesSceneRef to update the camera
    tilesSceneRef.current.setCameraPosition(position);
    tilesSceneRef.current.setCameraTarget(target);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setNewLabel((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitNewLabel = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!newLabel.name.trim() || !newLabel.description.trim()) {
      // Could add proper validation/error messaging here
      return;
    }

    // Submit the new label
    onCreatePubLabel(newLabel, {
      onSuccess: () => {
        // Reset form
        setNewLabel({
          name: "",
          description: "",
          type: "visual",
        });
        setShowForm(false);
      },
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Reset selected label when search changes
    setSelectedLabelId(null);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If Enter is pressed and a label is selected
    if (e.key === "Enter" && selectedLabelId && pubId) {
      e.preventDefault();
      onAddLabelToPub({
        pubId,
        labelId: selectedLabelId,
      });
      // Reset search and selection after adding
      setSearchTerm("");
      setSelectedLabelId(null);
    } else if (e.key === "ArrowDown") {
      // Move selection down
      e.preventDefault();
      const currentIndex = selectedLabelId
        ? filteredLabels.findIndex((label) => label.id === selectedLabelId)
        : -1;
      const nextIndex = (currentIndex + 1) % filteredLabels.length;
      setSelectedLabelId(filteredLabels[nextIndex]?.id || null);
    } else if (e.key === "ArrowUp") {
      // Move selection up
      e.preventDefault();
      const currentIndex = selectedLabelId
        ? filteredLabels.findIndex((label) => label.id === selectedLabelId)
        : filteredLabels.length;
      const prevIndex =
        (currentIndex - 1 + filteredLabels.length) % filteredLabels.length;
      setSelectedLabelId(filteredLabels[prevIndex]?.id || null);
    }
  };

  const handleLabelClick = (label: PubLabel) => {
    if (pubId && !addedLabelIds.has(label.id)) {
      onAddLabelToPub({
        pubId,
        labelId: label.id,
      });
    }
  };

  const handleLabelHover = (labelId: number) => {
    setSelectedLabelId(labelId);
  };

  //

  // Effects
  useEffect(() => {
    if (
      selectedPub &&
      !has_labels_added &&
      pubLabels.length > 0 &&
      !isSettingPubLabelsAdded
    ) {
      onSetPubLabelsAdded();
    }
  }, [
    selectedPub,
    has_labels_added,
    pubLabels.length,
    isSettingPubLabelsAdded,
    onSetPubLabelsAdded,
  ]);

  return (
    <div className="absolute top-24 right-2 bg-black/70 text-white p-3 rounded z-20 w-64">
      <h3 className="text-sm font-bold mb-2">{selectedPub?.name || ""}</h3>
      <h3 className="text-sm font-bold mb-2 mt-4">
        Available Pub Areas ({areasForPub?.length})
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
                  className="bg-gray-800 rounded p-2 text-xs cursor-pointer hover:bg-gray-700 transition-colors"
                  onClick={() => handleViewPubArea(area)}
                >
                  <div className="font-bold">{area.name}</div>
                  <div className="text-gray-300">{area.description}</div>
                  <div className="text-gray-400 mt-1">Type: {area.type}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <h3 className="text-sm font-bold mb-2 mt-4">
        Added Pub Labels ({pubLabels.length})
      </h3>

      {/* Search for Labels */}
      <div className="mb-2 relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search for labels..."
          className="w-full bg-gray-700 text-white text-xs p-2 rounded"
        />
        {searchTerm && filteredLabels.length > 0 && (
          <div className="absolute left-0 right-0 top-full bg-gray-800 rounded mt-1 max-h-48 overflow-y-auto z-30 shadow-lg">
            {filteredLabels.map((label) => {
              const isAlreadyAdded = addedLabelIds.has(label.id);
              return (
                <div
                  key={label.id}
                  className={`p-2 text-xs border-b border-gray-700 ${
                    selectedLabelId === label.id ? "bg-gray-700" : ""
                  } ${
                    isAlreadyAdded
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:bg-gray-700"
                  }`}
                  onClick={() => !isAlreadyAdded && handleLabelClick(label)}
                  onMouseEnter={() => handleLabelHover(label.id)}
                >
                  <div className="font-bold">{label.name}</div>
                  <div className="text-gray-400">Type: {label.type}</div>
                  {isAlreadyAdded && (
                    <div className="text-xs text-green-400 mt-1">
                      Already added
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pub's Added Labels */}
      <div className="max-h-32 overflow-y-auto mb-4">
        {pubLabels.length === 0 ? (
          <div className="text-xs text-gray-400">
            No labels added to this pub
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {pubLabels.map((label) => (
              <div
                key={label.id}
                className="bg-blue-700 rounded px-2 py-1 text-xs inline-flex items-center group relative cursor-help"
                title={label.description}
              >
                <span>{label.name}</span>

                {/* Custom tooltip */}
                <div
                  className="absolute left-0 bottom-full mb-2 w-48 bg-gray-900 text-white p-2 rounded shadow-lg 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 pointer-events-none"
                >
                  <div className="text-xs">{label.description}</div>
                  <div className="text-gray-400 text-xs">
                    Type: {label.type}
                  </div>
                  <div className="absolute left-4 bottom-0 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Labels list */}
      {!searchTerm && !showForm && (
        <div className="mt-4">
          <h3 className="text-sm font-bold mb-2">
            Available Labels ({availablePubLabels.length})
          </h3>
          <div className="max-h-64 overflow-y-auto">
            {availablePubLabels.map((label) => {
              const isAdded = addedLabelIds.has(label.id);
              return (
                <div
                  key={label.id}
                  className={`bg-gray-800 rounded p-2 text-xs mb-1 relative group ${
                    isAdded ? "opacity-50" : "cursor-pointer hover:bg-gray-700"
                  }`}
                  title={label.description} // Native HTML tooltip
                  onClick={() => !isAdded && handleLabelClick(label)}
                >
                  <div className="font-bold">{label.name}</div>
                  <div className="text-gray-400">Type: {label.type}</div>
                  {isAdded && (
                    <div className="absolute right-2 top-2 text-green-400 text-xs">
                      ✓
                    </div>
                  )}

                  {/* Custom styled tooltip */}
                  <div
                    className="absolute left-0 bottom-full mb-2 w-full bg-gray-900 text-white p-2 rounded shadow-lg 
                          opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 pointer-events-none"
                  >
                    <div className="text-xs">{label.description}</div>
                    <div className="absolute left-4 bottom-0 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Label Form */}
      {showForm && (
        <form
          onSubmit={handleSubmitNewLabel}
          className="mt-2 bg-gray-800 p-2 rounded"
        >
          <div className="mb-2">
            <label className="block text-xs mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={newLabel.name}
              onChange={handleInputChange}
              className="w-full bg-gray-700 text-white text-xs p-1 rounded"
              placeholder="Label name"
              required
            />
          </div>

          <div className="mb-2">
            <label className="block text-xs mb-1">Description</label>
            <textarea
              name="description"
              value={newLabel.description}
              onChange={handleInputChange}
              className="w-full bg-gray-700 text-white text-xs p-1 rounded"
              placeholder="Label description"
              rows={2}
              required
            />
          </div>

          <div className="mb-2">
            <label className="block text-xs mb-1">Type</label>
            <select
              name="type"
              value={newLabel.type}
              onChange={handleInputChange}
              className="w-full bg-gray-700 text-white text-xs p-1 rounded"
            >
              <option value="visual">Visual</option>
              <option value="vibe">Vibe</option>
              <option value="location">Location</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-green-600 w-full mt-2 hover:bg-green-700 text-white text-xs px-2 py-1 rounded disabled:opacity-50"
            disabled={isCreatingPubLabel}
          >
            {isCreatingPubLabel ? "Creating..." : "Create Label"}
          </button>
        </form>
      )}

      {/* New Label Form Toggle */}
      <button
        className="bg-blue-600 w-full mt-2 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? "Cancel" : "Add New Label"}
      </button>

      {/* Pub Labels List */}
      {!has_labels_added && pubLabels.length > 0 && (
        <button
          className="bg-green-600 w-full mt-4 hover:bg-green-700 text-white text-xs px-2 py-1 rounded disabled:opacity-50"
          onClick={onSetPubLabelsAdded}
          disabled={isSettingPubAreasPresent}
        >
          {isSettingPubAreasPresent ? "Updating... " : "Set Pub Labels present"}
        </button>
      )}
    </div>
  );
};

export default CreatePubLabels;
