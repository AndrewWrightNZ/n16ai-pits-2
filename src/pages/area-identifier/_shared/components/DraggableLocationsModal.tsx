import React, { useState, useRef, useEffect } from "react";
import { PRESET_LOCATIONS } from "../../../../maps/_shared/hooks/locationsData";
import useMapSettings from "../../../../maps/_shared/hooks/useMapSettings";

interface DraggableLocationsModalProps {
  initialPosition?: { x: number; y: number };
  title?: string;
  className?: string;
}

const DraggableLocationsModal: React.FC<DraggableLocationsModalProps> = ({
  initialPosition = { x: 20, y: 20 },
  title = "Locations",
  className = "",
}) => {
  // Hooks
  const {
    data: {
      // Location
      currentLocation,
    },
    operations: {
      // Location
      onSetCurrentLocation,
    },
  } = useMapSettings();

  // State for modal positioning and behavior
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Refs
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
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

  // Convert locations from Record to array with keys for display
  const locationsArray = Object.entries(PRESET_LOCATIONS).map(
    ([key, location]) => ({
      id: key,
      key: key,
      name: location.description || key, // Use description as name or fallback to key
      ...location,
    })
  );

  // Filter locations based on search term
  const filteredLocations = locationsArray.filter(
    (location) =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      ref={modalRef}
      className={`absolute z-20 bg-black/80 text-white rounded-md shadow-lg ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isCollapsed ? "auto" : "300px",
        transition: "height 0.3s ease",
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
          <h3 className="text-sm font-medium">{title}</h3>
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
            onClick={() => setPosition(initialPosition)}
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
              placeholder="Search locations..."
              className="w-full px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Locations list */}
          <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((location) => (
                <div
                  key={location.id}
                  className={`group ${
                    currentLocation === location.key
                      ? "bg-blue-800"
                      : "bg-gray-700"
                  } hover:bg-gray-600 rounded-md p-2 cursor-pointer transition-colors`}
                  onClick={() => onSetCurrentLocation(location.key)}
                >
                  <div className="flex items-center">
                    <div>
                      <h4 className="text-sm font-medium group-hover:text-white">
                        {location.name}
                      </h4>
                      <p className="text-xs text-gray-300 truncate max-w-[200px]">
                        {location.description}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">
                        Alt: {location.altitude}m
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-2 text-gray-400 text-sm">
                No locations found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DraggableLocationsModal;
