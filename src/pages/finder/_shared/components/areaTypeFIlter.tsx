import { useState, useRef, useEffect } from "react";

// Icons
import { Cross, Beer, Coffee, Umbrella, Home, Building } from "lucide-react";

// Hooks
import usePubAreas from "../../../areas/identifier/_shared/hooks/usePubAreas";

interface AreaTypeFilterProps {
  onClose: () => void;
}

const AreaTypeFilter: React.FC<AreaTypeFilterProps> = ({ onClose }) => {
  // Hooks
  const {
    data: {
      availableAreaTypes = [],
      selectedAreaTypes = [],
      areasOfTypes = [],
    },
    operations: { onSelectAreaType },
  } = usePubAreas();

  // State for modal position and dragging
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Format area type labels for display
  const formatAreaType = (type: string) => {
    return type
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get icon for area type
  const getIconForAreaType = (type: string) => {
    switch (type) {
      case "beer-garden":
        return <Beer size={16} />;
      case "terrace":
        return <Coffee size={16} />;
      case "pavement":
        return <Umbrella size={16} />;
      case "frontage-seating":
        return <Home size={16} />;
      case "courtyard":
        return <Building size={16} />;
      case "terrace-waterfront":
        return <Umbrella size={16} />;
      default:
        return <Umbrella size={16} />;
    }
  };

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      modalRef.current &&
      e.target === modalRef.current.querySelector(".modal-header")
    ) {
      setIsDragging(true);
      const boundingRect = modalRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - boundingRect.left,
        y: e.clientY - boundingRect.top,
      });
    }
  };

  // Handle dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && modalRef.current) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Ensure the modal stays within viewport bounds
      const modalWidth = modalRef.current.offsetWidth;
      const modalHeight = modalRef.current.offsetHeight;
      const maxX = window.innerWidth - modalWidth;
      const maxY = window.innerHeight - modalHeight;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Set up and clean up event listeners
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

  // Handle pill selection
  const handlePillClick = (type: string) => {
    onSelectAreaType(type);
  };

  return (
    <div
      ref={modalRef}
      className="absolute bg-white rounded-lg shadow-lg z-50 w-72"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
    >
      <div className="modal-header bg-gray-500 text-white font-medium py-2 px-4 rounded-t-lg cursor-move flex justify-between items-center">
        <span>Filter by Area Type</span>
        <button onClick={onClose} className="text-white hover:text-gray-200">
          <Cross size={18} />
        </button>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {availableAreaTypes.map((type) => (
            <button
              key={type}
              onClick={() => handlePillClick(type)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedAreaTypes.includes(type)
                  ? "bg-gray-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="flex items-center justify-center">
                {getIconForAreaType(type)}
              </span>
              <span>{formatAreaType(type)}</span>
            </button>
          ))}
        </div>

        {selectedAreaTypes.length > 0 && (
          <button
            onClick={() => {
              availableAreaTypes.forEach((type) => {
                if (selectedAreaTypes.includes(type)) {
                  onSelectAreaType(type);
                }
              });
            }}
            className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium py-1.5 px-2 rounded"
          >
            Clear All Filters
          </button>
        )}

        <p className="text-sm mt-4">Showing {areasOfTypes.length} areas</p>
      </div>
    </div>
  );
};

export default AreaTypeFilter;
