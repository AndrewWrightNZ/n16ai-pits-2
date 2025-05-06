import React, { useState, useRef, useEffect } from "react";

// Hooks
import usePubs from "../../../../../_shared/hooks/pubs/usePubs";

// Types
import { Pub } from "../../../../../_shared/types";

interface DraggableLocationsModalProps {
  filterType: string;
  onJumpToPub?: (pub: any) => void;
}

const DraggableLocationsModal: React.FC<DraggableLocationsModalProps> = ({
  filterType,
  onJumpToPub,
}) => {
  // Hooks
  const {
    data: { pubs = [] },
  } = usePubs();

  // State for modal positioning and behavior
  const [position, setPosition] = useState({ x: 10, y: 210 });
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPub, setSelectedPub] = useState<Pub | null>(null);
  const [showNeedsWork, setShowNeedsWork] = useState(true); // New state for toggling filter

  // Simple drag state to store starting positions
  const dragRef = useRef({
    startMouseX: 0,
    startMouseY: 0,
    startPosX: 0,
    startPosY: 0,
  });

  // Simplified dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    // Store starting positions
    dragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
    setIsDragging(true);
    // Prevent text selection during drag
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    // Calculate how far the mouse has moved from start position
    const deltaX = e.clientX - dragRef.current.startMouseX;
    const deltaY = e.clientY - dragRef.current.startMouseY;

    // Set new position = starting position + delta movement
    setPosition({
      x: dragRef.current.startPosX + deltaX,
      y: dragRef.current.startPosY + deltaY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Filter pubs based on search term and filter toggle
  const filteredPubs = pubs.filter((pub) => {
    if (filterType === "areas") {
      // First, apply the needs work filter if enabled
      if (showNeedsWork && pub.has_areas_added === true) {
        return false;
      }
    } else {
      // First, apply the needs work filter if enabled
      if (showNeedsWork && pub.has_labels_added === true) {
        return false;
      }
    }
    // Then apply the search term filter
    return (
      pub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pub.address_text &&
        pub.address_text.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Count pubs that need work
  const pubsNeedingWork = pubs.filter(
    (pub) => pub.has_areas_added !== true
  ).length;

  // Function to jump to a pub location
  const handleJumpToPub = (pub: Pub) => {
    setSelectedPub(pub);

    // Jump to this location
    if (onJumpToPub) {
      onJumpToPub(pub);
    }
  };

  return (
    <div
      className={`absolute z-20 bg-black/80 text-white rounded-md shadow-lg`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isCollapsed ? "auto" : "300px",
        transition: "height 0.3s ease",
        cursor: isDragging ? "grabbing" : "auto",
      }}
    >
      {/* Header with drag handle */}
      <div
        className="flex justify-between items-center p-2 bg-gray-800 rounded-t-md cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white hover:text-gray-300 transition-colors"
          >
            {isCollapsed ? "▶" : "▼"}
          </button>
          <h3 className="text-sm font-medium">Select a Pub</h3>
        </div>
        <div className="flex space-x-1">
          <button
            className="h-4 w-4 bg-green-500 rounded-full hover:bg-green-400 transition-colors"
            aria-label="minimize"
            onClick={() => setIsCollapsed(true)}
          />
          <button
            className="h-4 w-4 bg-yellow-500 rounded-full hover:bg-yellow-400 transition-colors"
            aria-label="reset position"
            onClick={() => setPosition({ x: 20, y: 20 })}
          />
          <button
            className="h-4 w-4 bg-red-500 rounded-full hover:bg-red-400 transition-colors"
            aria-label="close"
            onClick={() => setIsCollapsed(true)}
          />
        </div>
      </div>

      {/* Content - only shown when not collapsed */}
      {!isCollapsed && (
        <div className="p-3">
          {/* Search bar */}
          <div className="mb-3">
            <input
              type="text"
              placeholder={"Search pubs..."}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter toggle */}
          <div className="mb-3 flex items-center">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showNeedsWork}
                onChange={() => setShowNeedsWork(!showNeedsWork)}
                className="sr-only peer"
              />
              <div className="relative w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-2 text-xs text-gray-300">
                Only show pubs needing {filterType}
              </span>
            </label>
          </div>

          {/* Stats */}
          <div className="mb-2 text-xs text-gray-400">
            <p>
              {showNeedsWork
                ? `Showing ${filteredPubs.length} of ${pubsNeedingWork} pubs needing areas`
                : `Showing ${filteredPubs.length} of ${pubs.length} pubs`}
            </p>
          </div>

          {/* Locations or Pubs list */}
          <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
            {filteredPubs.length > 0 ? (
              filteredPubs.map((pub) => (
                <div
                  key={pub.id}
                  className={`group ${
                    selectedPub && selectedPub.id === pub.id
                      ? "bg-blue-800"
                      : "bg-gray-700"
                  } hover:bg-gray-600 rounded-md p-2 cursor-pointer transition-colors`}
                  onClick={() => handleJumpToPub(pub)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium group-hover:text-white">
                        {pub.name}
                      </h4>
                      <p className="text-xs text-gray-300 truncate max-w-[200px]">
                        {pub.address_text || "Address not available"}
                      </p>
                      <div className="flex space-x-2 text-xs text-gray-400">
                        <span>Lat: {pub.latitude.toFixed(4)}</span>
                        <span>Lng: {pub.longitude.toFixed(4)}</span>
                      </div>
                    </div>

                    {filterType === "areas" ? (
                      <>
                        {pub.has_areas_added ? (
                          <span className="text-xs px-1.5 py-0.5 bg-green-800 text-green-200 rounded">
                            Areas Added
                          </span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-200 rounded">
                            0 areas
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {pub.has_labels_added ? (
                          <span className="text-xs px-1.5 py-0.5 bg-green-800 text-green-200 rounded">
                            Labels Added
                          </span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-200 rounded">
                            0 labels
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-2 text-gray-400 text-sm">
                {searchTerm ? "No matching pubs found" : "No pubs available"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DraggableLocationsModal;
