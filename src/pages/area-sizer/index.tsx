import React, { useRef, useState, useEffect } from "react";

// Components
import MapDrawingComponent, {
  MapDrawingRef,
} from "./_shared/components/MapDrawingComponent";
import SavedAreas from "./_shared/components/SavedAreas";
import PubList from "./_shared/components/SelectPubFromList";

// Hooks
import usePubs from "../finder/_shared/hooks/usePubs";
import usePubAreas from "../area-identifier/_shared/hooks/usePubAreas";

// Types
import { Pub } from "../../_shared/types";

const PubAreaSizer: React.FC = () => {
  // State
  const [area, setArea] = useState<number>(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);

  // Refs
  const mapRef = useRef<MapDrawingRef>(null);

  // Hooks
  const {
    data: { areasForPub = [], selectedPub },
    operations: { onSetSelectedPub, onSaveFloorArea },
  } = usePubAreas();
  const { data: pubsData } = usePubs();

  const { pubs } = pubsData;

  // Handle area changes
  const handleAreaChange = (newArea: number): void => {
    setArea(newArea);
  };

  // Handle pub selection
  const handleSelectPub = (pub: Pub): void => {
    // Clear the selected area when changing pubs
    setSelectedAreaId(null);
    onSetSelectedPub(pub);
  };

  // Handle saved area selection
  const handleSelectArea = (areaId: number): void => {
    setSelectedAreaId(areaId);

    // Find the selected area
    const selectedArea = areasForPub.find((area) => area.id === areaId);

    if (selectedArea && mapRef.current) {
      // Pan to the area's location
      mapRef.current.panTo(selectedArea.latitude, selectedArea.longitude);

      // TODO: In a full implementation, we would load and display the polygon/shape
      // This would require additional data in the area object (coordinates array)
      // and implementing a method in MapDrawingComponent to render a saved shape
    }
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
      // Reset selected area when changing pubs
      setSelectedAreaId(null);

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

  // Clear the current area
  const clearArea = (): void => {
    if (mapRef.current) {
      mapRef.current.clearShape();
    }
    setArea(0);
    // Also clear the selected area
    setSelectedAreaId(null);
  };

  const handleSaveFloorArea = () => {
    onSaveFloorArea({
      pub_area_id: selectedAreaId as number,
      floor_area: area,
    });
  };

  return (
    <div className="p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left sidebar - Pub List */}
        <div className="w-full lg:w-1/4 space-y-4">
          {/* Measurement */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-2">Area Measurement</h2>
            <p className="text-gray-700">Calculated Area Size:</p>
            <p className="text-xl font-semibold text-blue-600">
              {area.toFixed(2)} m²
            </p>
            <p className="text-sm text-gray-500">
              {(area * 10.7639).toFixed(2)} sq ft
            </p>

            <div className="flex gap-2 mt-4">
              <button
                onClick={clearArea}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={handleSaveFloorArea}
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
          {selectedPub && (
            <SavedAreas
              areas={areasForPub}
              onSelectArea={handleSelectArea}
              selectedAreaId={selectedAreaId}
            />
          )}

          {/* Pub Selection */}
          <PubList
            pubs={pubs}
            selectedPub={selectedPub}
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
