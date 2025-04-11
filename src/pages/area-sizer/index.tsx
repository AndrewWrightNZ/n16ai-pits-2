import React, { useRef, useState, useEffect } from "react";
import MapDrawingComponent, {
  MapDrawingRef,
} from "./_shared/components/MapDrawingComponent";
import usePubs from "../finder/_shared/hooks/usePubs";
import PubList from "./_shared/components/SelectPubFromList";

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
  const [savedAreas, setSavedAreas] = useState<AreaData[]>([]);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    visible: false,
    message: "",
    type: "info",
  });

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
    console.log(`Selecting pub with ID: ${pubId}`);
    onSetSelectedPubId(pubId);
  };

  // Check if map is ready when component mounts
  useEffect(() => {
    const checkMapReady = setInterval(() => {
      if (mapRef.current && mapRef.current.isMapReady) {
        console.log("Map is now ready!");
        setIsMapReady(true);
        clearInterval(checkMapReady);
      }
    }, 500);

    return () => clearInterval(checkMapReady);
  }, []);

  // When selected pub changes, center the map on it
  useEffect(() => {
    console.log("selectedPub changed:", selectedPub?.name);

    if (selectedPub && mapRef.current) {
      // Force a slight delay to ensure the map is fully initialized
      setTimeout(() => {
        console.log(
          `Attempting to pan to: ${selectedPub.name} at ${selectedPub.latitude}, ${selectedPub.longitude}`
        );

        // Make sure map is ready before trying to pan
        if (mapRef.current && mapRef.current.isMapReady) {
          try {
            mapRef.current.panTo(selectedPub.latitude, selectedPub.longitude);
            console.log("Pan command sent successfully");

            // Check if this pub already has a saved area
            const existingArea = savedAreas.find(
              (savedArea) => savedArea.pubId === selectedPub.id
            );

            if (existingArea) {
              showNotification(
                `${selectedPub.name} already has a saved area of ${existingArea.area.toFixed(2)} m²`,
                "info"
              );
            }
          } catch (error) {
            console.error("Error panning to location:", error);
            showNotification(
              "Unable to center map on selected pub. Try again.",
              "error"
            );
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
      showNotification("Please select a pub and draw an area", "error");
      return;
    }

    const coordinates = mapRef.current?.getShapeCoordinates();

    if (!coordinates || coordinates.length < 3) {
      showNotification("Please draw a valid area", "error");
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

    // Check if an area already exists for this pub
    const existingAreaIndex = savedAreas.findIndex(
      (savedArea) => savedArea.pubId === selectedPub.id
    );

    let updatedAreas: AreaData[];

    if (existingAreaIndex >= 0) {
      // Update existing area
      updatedAreas = [...savedAreas];
      updatedAreas[existingAreaIndex] = newAreaData;
      showNotification(`Updated area for ${selectedPub.name}`, "success");
    } else {
      // Add new area
      updatedAreas = [...savedAreas, newAreaData];
      showNotification(`Saved area for ${selectedPub.name}`, "success");
    }

    setSavedAreas(updatedAreas);

    // Here you would typically save this data to your database
    console.log("Area data to save:", newAreaData);
  };

  // Clear the current area
  const clearArea = (): void => {
    if (mapRef.current) {
      mapRef.current.clearShape();
    }
    setArea(0);
  };

  // Export data as JSON
  const exportData = (): void => {
    if (savedAreas.length === 0) {
      showNotification("No areas to export", "info");
      return;
    }

    const dataStr = JSON.stringify(savedAreas, null, 2);

    try {
      // Create a Blob and download via URL
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "pub-areas.json";
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      showNotification("Data exported successfully", "success");
    } catch (error) {
      console.error("Error exporting data:", error);
      showNotification("Failed to export data", "error");
    }
  };

  // Show a notification
  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ): void => {
    setNotification({
      visible: true,
      message,
      type,
    });

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Debug button to manually trigger panning
  const debugPanToSelectedPub = () => {
    if (selectedPub && mapRef.current) {
      console.log(`Debug: Manually panning to ${selectedPub.name}`);
      mapRef.current.panTo(selectedPub.latitude, selectedPub.longitude);
    } else {
      console.log("No pub selected or map not available");
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">Pub Outside Area Measurement</h1>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left sidebar - Pub List */}
        <div className="w-full lg:w-1/4">
          <PubList
            pubs={pubs}
            selectedPubId={selectedPubId}
            onSelectPub={handleSelectPub}
          />

          {/* Debug button - only visible during development */}
          {process.env.NODE_ENV === "development" && (
            <button
              onClick={debugPanToSelectedPub}
              className="mt-4 p-2 bg-yellow-200 text-yellow-800 text-sm rounded"
            >
              Debug: Pan to selected pub
            </button>
          )}
        </div>

        {/* Center - Map */}
        <div className="w-full lg:w-2/4 bg-white rounded-lg shadow-md overflow-hidden">
          <MapDrawingComponent
            ref={mapRef}
            onAreaChange={handleAreaChange}
            height="500px"
            initialZoom={15}
          />
        </div>

        {/* Right sidebar - Controls & Saved Areas */}
        <div className="w-full lg:w-1/4 space-y-4">
          {/* Selected Pub */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-2">Selected Pub</h2>
            {selectedPub ? (
              <div>
                <p className="font-medium">{selectedPub.name}</p>
                <p className="text-sm text-gray-600">
                  {selectedPub.address_text}
                </p>
                <div className="text-xs text-gray-500 mt-1">
                  Coordinates: {selectedPub.latitude.toFixed(5)},{" "}
                  {selectedPub.longitude.toFixed(5)}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic">Select a pub from the list</p>
            )}
          </div>

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
              {savedAreas.length > 0 && (
                <button
                  onClick={exportData}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Export Data
                </button>
              )}
            </div>

            {savedAreas.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No areas saved yet</p>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {savedAreas.map((savedArea) => (
                  <div
                    key={savedArea.id}
                    className="border-b border-gray-200 py-2 last:border-b-0"
                  >
                    <p className="font-medium">{savedArea.pubName}</p>
                    <p className="text-sm text-gray-600">
                      {savedArea.area.toFixed(2)} m² (
                      {savedArea.areaFt.toFixed(2)} sq ft)
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification.visible && (
        <div
          className={`fixed bottom-4 right-4 p-3 rounded shadow-lg max-w-xs ${
            notification.type === "success"
              ? "bg-green-50 border-l-4 border-green-500 text-green-700"
              : notification.type === "error"
                ? "bg-red-50 border-l-4 border-red-500 text-red-700"
                : "bg-blue-50 border-l-4 border-blue-500 text-blue-700"
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default PubAreaSizer;
