import React, { useState, useRef, useEffect } from "react";
import { PRESET_LOCATIONS } from "../../../../maps/_shared/hooks/locationsData";
import useMapSettings from "../../../../maps/_shared/hooks/useMapSettings";
import usePubs from "../../../finder/_shared/hooks/usePubs";
import { Pub } from "../../../../_shared/types";

interface DraggableLocationsModalProps {
  initialPosition?: { x: number; y: number };
  title?: string;
  className?: string;
  onJumpToPub?: (pub: any) => void;
}

// Simple function to create a basic location from pub lat/lng
function createBasicLocationFromPub(pub: Pub) {
  return {
    lat: pub.latitude,
    lng: pub.longitude,
    altitude: 250, // Default altitude
    heading: 0, // Default heading
    description: pub.name,
    // We'll let the UI handle camera positioning via orbit controls
  };
}

const DraggableLocationsModal: React.FC<DraggableLocationsModalProps> = ({
  initialPosition = { x: 20, y: 20 },
  title = "Locations",
  className = "",
  onJumpToPub,
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

  const {
    data: { pubs = [] },
  } = usePubs();

  // State for modal positioning and behavior
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPubs, setShowPubs] = useState(false);
  const [selectedPub, setSelectedPub] = useState<Pub | null>(null);

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

  // Filter pubs based on search term
  const filteredPubs = pubs.filter(
    (pub) =>
      pub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pub.address_text &&
        pub.address_text.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Function to jump to a pub location - simplified to only use lat/lng
  const handleJumpToPub = (pub: Pub) => {
    setSelectedPub(pub);

    // Create a basic location using just lat/lng
    const basicLocation = createBasicLocationFromPub(pub);

    // Jump to this location
    if (onJumpToPub) {
      onJumpToPub(pub);
    } else {
      // Fallback - Create a temporary location key and use it
      const tempLocationKey = `temp_pub_${pub.id}`;

      // Temporarily add this location to PRESET_LOCATIONS
      PRESET_LOCATIONS[tempLocationKey] = basicLocation;

      // Set the current location to this new temp location
      onSetCurrentLocation(tempLocationKey);
    }
  };

  // Function to generate simple location code for a pub
  const generateLocationCode = () => {
    if (!selectedPub) return "";

    const locationKey = selectedPub.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");
    const basicLocation = createBasicLocationFromPub(selectedPub);

    return `${locationKey}: ${JSON.stringify(basicLocation, null, 2)},`;
  };

  // Function to copy location code to clipboard
  const copyLocationToClipboard = () => {
    const code = generateLocationCode();
    navigator.clipboard.writeText(code);
    alert("Location code copied to clipboard!");
  };

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
          {/* Toggle between preset locations and pubs */}
          <div className="flex mb-3 gap-2">
            <button
              className={`flex-1 py-1 px-2 text-xs rounded ${
                !showPubs ? "bg-blue-600" : "bg-gray-700"
              }`}
              onClick={() => setShowPubs(false)}
            >
              Presets
            </button>
            <button
              className={`flex-1 py-1 px-2 text-xs rounded ${
                showPubs ? "bg-blue-600" : "bg-gray-700"
              }`}
              onClick={() => setShowPubs(true)}
            >
              Pubs ({pubs.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="mb-3">
            <input
              type="text"
              placeholder={showPubs ? "Search pubs..." : "Search locations..."}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Locations or Pubs list */}
          <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
            {/* Show preset locations */}
            {!showPubs &&
              (filteredLocations.length > 0 ? (
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
              ))}

            {/* Show pubs */}
            {showPubs &&
              (filteredPubs.length > 0 ? (
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
                    <div className="flex items-center">
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
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-2 text-gray-400 text-sm">
                  No pubs found
                </div>
              ))}
          </div>

          {/* Simple copy button for selected pub */}
          {showPubs && selectedPub && (
            <div className="mt-3 border-t border-gray-700 pt-3 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Now use orbit controls to adjust the view
              </span>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
                onClick={copyLocationToClipboard}
              >
                Copy Location
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DraggableLocationsModal;
