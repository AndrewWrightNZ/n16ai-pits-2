import React, { useRef, useState, useEffect } from "react";

// Components
import MapDrawingComponent, {
  MapDrawingRef,
} from "./_shared/components/MapDrawingComponent";
import PubList from "./_shared/components/SelectPubFromList";

// Hooks
import usePubs from "../finder/_shared/hooks/usePubs";
interface AreaData {
  id: string;
  pubId: number;
  pubName: string;
  area: number;
  areaFt: number;
  coordinates: { lat: number; lng: number }[];
  createdAt: string;
}

const PubAreaSizer: React.FC = () => {
  // State
  const [area, setArea] = useState<number>(0);

  // Add this debug state to track map readiness
  const [isMapReady, setIsMapReady] = useState(false);

  // Refs
  const mapRef = useRef<MapDrawingRef>(null);

  // Fetch pubs data using the hook
  const { data: pubsData, operations: pubsOperations } = usePubs();

  const { pubs, selectedPub, selectedPubId } = pubsData;

  const { onSetSelectedPubId } = pubsOperations;

  // Handle area changes
  const handleAreaChange = (newArea: number): void => {
    setArea(newArea);
  };

  // Handle pub selection
  const handleSelectPub = (pubId: number): void => {
    onSetSelectedPubId(pubId);
  };

  // Check if map is ready when component mounts
  useEffect(() => {
    const checkMapReady = setInterval(() => {
      if (mapRef.current && mapRef.current.isMapReady) {
        setIsMapReady(true);
        clearInterval(checkMapReady);
      }
    }, 500);

    return () => clearInterval(checkMapReady);
  }, []);

  // When selected pub changes, center the map on it
  useEffect(() => {
    if (selectedPub && mapRef.current) {
      // Force a slight delay to ensure the map is fully initialized
      setTimeout(() => {
        // Make sure map is ready before trying to pan
        if (mapRef.current && mapRef.current.isMapReady) {
          try {
            mapRef.current.panTo(selectedPub.latitude, selectedPub.longitude);
          } catch (error) {
            console.log("Error panning to location:", error);
          }
        } else {
          console.warn("Map not ready yet. Cannot pan to location.");
        }
      }, 300);
    }
  }, [selectedPub, isMapReady]);

  // Save the current area
  const saveArea = (): void => {
    if (!selectedPub || area === 0) {
      return;
    }

    const coordinates = mapRef.current?.getShapeCoordinates();

    if (!coordinates || coordinates.length < 3) {
      return;
    }

    const newAreaData: AreaData = {
      id: Date.now().toString(),
      pubId: selectedPub.id,
      pubName: selectedPub.name,
      area: area,
      areaFt: area * 10.7639, // Convert to square feet
      coordinates: coordinates,
      createdAt: new Date().toISOString(),
    };

    console.log("Save area data to DB:", newAreaData);
  };

  // Clear the current area
  const clearArea = (): void => {
    if (mapRef.current) {
      mapRef.current.clearShape();
    }
    setArea(0);
  };

  return (
    <div className="p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left sidebar - Pub List */}
        <div className="w-full lg:w-1/4 space-y-4">
          {/* Measurement */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-2">Area Measurement</h2>
            <div className="bg-gray-50 p-3 rounded mb-3">
              <p className="text-gray-700">Outside Area Size:</p>
              <p className="text-xl font-semibold text-blue-600">
                {area.toFixed(2)} m²
              </p>
              <p className="text-sm text-gray-500">
                {(area * 10.7639).toFixed(2)} sq ft
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={clearArea}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={saveArea}
                disabled={!selectedPub || area === 0}
                className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex-1 ${
                  !selectedPub || area === 0
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Save Area
              </button>
            </div>
          </div>

          {/* Saved Areas */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Saved Areas</h2>
            </div>

            {true ? (
              <p className="text-gray-500 italic text-sm">No areas saved yet</p>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                <p>Zaved areas here</p>
              </div>
            )}
          </div>
          <PubList
            pubs={pubs}
            selectedPubId={selectedPubId}
            onSelectPub={handleSelectPub}
          />
        </div>

        {/* Center - Map */}
        <div className="w-full lg:w-3/4 bg-white rounded-lg shadow-md overflow-hidden">
          <MapDrawingComponent
            ref={mapRef}
            onAreaChange={handleAreaChange}
            height="800px"
            initialZoom={15}
          />
        </div>
      </div>
    </div>
  );
};

export default PubAreaSizer;
