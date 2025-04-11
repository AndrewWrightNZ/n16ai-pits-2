import React, { useRef, useState, useEffect } from "react";

// Components
import MapDrawingComponent, {
  MapDrawingRef,
} from "./_shared/components/MapDrawingComponent";
import StaticMapView from "./_shared/components/StaticMapView";
import SavedAreas from "./_shared/components/SavedAreas";
import PubList from "./_shared/components/SelectPubFromList";

// Hooks
import usePubs from "../finder/_shared/hooks/usePubs";
import usePubAreas, {
  PolygonCoordinate,
} from "../area-identifier/_shared/hooks/usePubAreas";

// Types
import { Pub } from "../../_shared/types";

const PubAreaSizer: React.FC = () => {
  // State
  const [area, setArea] = useState<number>(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [currentPolygon, setCurrentPolygon] = useState<
    PolygonCoordinate[] | null
  >(null);
  const [isPendingAreaUpdate, setIsPendingAreaUpdate] = useState(false);
  const [showStaticMap, setShowStaticMap] = useState<boolean>(false);

  // Refs
  const mapRef = useRef<MapDrawingRef>(null);

  // Hooks
  const {
    data: { areasForPub = [], selectedPub },
    operations: { onSetSelectedPub, onSaveFloorArea },
  } = usePubAreas();

  const {
    data: { pubs = [] },
  } = usePubs();

  // Handle area changes from the map
  const handleAreaChange = (newArea: number): void => {
    setArea(newArea);
  };

  // Handle polygon completion
  const handlePolygonComplete = (coordinates: PolygonCoordinate[]): void => {
    if (coordinates.length === 0) {
      setCurrentPolygon(null);
      return;
    }

    setCurrentPolygon(coordinates);

    // Mark that we're not waiting for an area update anymore
    setIsPendingAreaUpdate(false);

    // Show the polygon
    toggleMapView();
  };

  // Handle pub selection from list
  const handleSelectPub = (pub: Pub): void => {
    // Reset states when changing pubs
    setSelectedAreaId(null);
    setCurrentPolygon(null);
    setArea(0);
    setIsPendingAreaUpdate(false);
    setShowStaticMap(false);

    onSetSelectedPub(pub);
  };

  // Handle saved area selection
  const handleSelectArea = (areaId: number): void => {
    // Clear any existing shape and reset polygon state
    if (mapRef.current) {
      mapRef.current.clearShape();
    }
    setCurrentPolygon(null);
    setArea(0);
    setShowStaticMap(false);

    // Set the selected area ID
    setSelectedAreaId(areaId);

    // Mark that we're waiting for an area update
    setIsPendingAreaUpdate(true);

    // Find the selected area
    const selectedArea = areasForPub.find((area) => area.id === areaId);

    if (selectedArea && mapRef.current && mapRef.current.isMapReady) {
      // Center the map on the area location
      mapRef.current.setCenter(selectedArea.latitude, selectedArea.longitude);
      mapRef.current.setZoom(20);
    }
  };

  // Check map readiness on mount
  useEffect(() => {
    const checkMapReady = setInterval(() => {
      if (mapRef.current && mapRef.current.isMapReady) {
        setIsMapReady(true);
        clearInterval(checkMapReady);
      }
    }, 500);

    return () => clearInterval(checkMapReady);
  }, []);

  // Handle selected pub changes
  useEffect(() => {
    if (selectedPub && mapRef.current && isMapReady) {
      // Reset states
      setSelectedAreaId(null);
      setCurrentPolygon(null);
      setArea(0);
      setIsPendingAreaUpdate(false);
      setShowStaticMap(false);

      // Clear existing shape
      mapRef.current.clearShape();

      // Position the map at the pub location
      mapRef.current.setCenter(selectedPub.latitude, selectedPub.longitude);
      mapRef.current.setZoom(19);
    }
  }, [selectedPub, isMapReady]);

  // Clear the current area
  const clearArea = (): void => {
    if (mapRef.current) {
      mapRef.current.clearShape();
    }
    setArea(0);
    setCurrentPolygon(null);
    setIsPendingAreaUpdate(true);
    setShowStaticMap(false);
  };

  // Toggle between editable and static map views
  const toggleMapView = (): void => {
    setShowStaticMap(!showStaticMap);
  };

  // Save the current area measurement to the selected pub area
  const handleSaveFloorArea = () => {
    if (
      !selectedAreaId ||
      area === 0 ||
      !currentPolygon ||
      currentPolygon.length < 3
    ) {
      console.log("Cannot save: missing data", {
        selectedAreaId,
        area,
        polygonPoints: currentPolygon?.length,
      });
      return;
    }

    onSaveFloorArea({
      pub_area_id: selectedAreaId,
      floor_area: area,
      coordinates: currentPolygon,
    });

    // Clear the current area
    clearArea();
  };

  return (
    <div className="p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left sidebar */}
        <div className="w-full lg:w-1/4 space-y-4">
          {/* Area measurement panel */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-2">Area Measurement</h2>

            {selectedAreaId && isPendingAreaUpdate ? (
              <div className="bg-blue-50 p-3 rounded mb-3 text-sm text-blue-700">
                Draw a polygon on the map to calculate the area
              </div>
            ) : null}

            <div className="bg-gray-50 p-3 rounded mb-3">
              <p className="text-gray-700">Calculated Area Size:</p>
              <p className="text-xl font-semibold text-blue-600">
                {area.toFixed(2)} m²
              </p>
              <p className="text-sm text-gray-500">
                {(area * 10.7639).toFixed(2)} sq ft
              </p>
            </div>

            {currentPolygon && (
              <div className="text-xs text-gray-500 mb-3">
                <p>Shape has {currentPolygon.length} points</p>
                <p className="mt-1 text-green-600">
                  Polygon is visible on the map
                </p>

                {/* Toggle button for map view */}
                <button
                  onClick={toggleMapView}
                  className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                >
                  {showStaticMap ? "Back to Editing" : "Show Polygon View"}
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={clearArea}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={handleSaveFloorArea}
                disabled={!selectedAreaId || area === 0 || !currentPolygon}
                className={`px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 flex-1 ${
                  !selectedAreaId || area === 0 || !currentPolygon
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Save Area
              </button>
            </div>
          </div>

          {/* Saved areas list */}
          {selectedPub && (
            <SavedAreas
              areas={areasForPub}
              onSelectArea={handleSelectArea}
              selectedAreaId={selectedAreaId}
            />
          )}

          {/* Pub selection list */}
          <PubList
            pubs={pubs}
            selectedPub={selectedPub}
            onSelectPub={handleSelectPub}
          />
        </div>

        {/* Map component */}
        <div className="w-full lg:w-3/4 bg-white rounded-lg shadow-md overflow-hidden">
          {showStaticMap && currentPolygon && selectedPub ? (
            <StaticMapView
              center={{ lat: selectedPub.latitude, lng: selectedPub.longitude }}
              polygon={currentPolygon}
              height="800px"
              zoom={19}
            />
          ) : (
            <MapDrawingComponent
              ref={mapRef}
              onAreaChange={handleAreaChange}
              onPolygonComplete={handlePolygonComplete}
              height="800px"
              initialZoom={15}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PubAreaSizer;
