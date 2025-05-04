import { useState, useMemo } from "react";

// Hooks
import useMapMarkers from "../../../../../_shared/hooks/mapMarkers/useMapMarkers";
import usePubAreas from "../../../../../_shared/hooks/pubAreas/usePubAreas";
import useUserGeoLocation from "../../../../../_shared/hooks/user/useGeolocation";

// Components
import DynamicSunIcon from "../../../../../_shared/components/dynamicSunIcon";

// Helpers
import { formatAreaType } from "../../../../lists/_shared";
import {
  extractPostCodeFromAddress,
  formatShortAddress,
} from "../../../../lists/pubs/_shared/helpers";

// Render pub content component
const ViewPubDetails = () => {
  // Local state for content visibility
  const [isVisible, setIsVisible] = useState(true);

  // Hooks
  const {
    data: { selectedPub },
    operations: { onSetSelectedPub },
  } = usePubAreas();

  const {
    data: { mapReadyMarkers },
  } = useMapMarkers();

  const {
    data: { userLatitude, userLongitude },
  } = useUserGeoLocation();

  // Handle close with animation
  const handleClose = () => {
    // Step 1: Hide content
    setIsVisible(false);

    // Step 2: After 200ms, process the onSetSelectedPub(null) action
    setTimeout(() => {
      onSetSelectedPub(null);
    }, 200);
  };

  // Variables
  const { name = "", address_text = "" } = selectedPub || {};

  const selectedPubMarker = mapReadyMarkers.find(
    (marker) => marker.pub.id === selectedPub?.id
  );

  const { bestSunPercent = 0, pubAreas = [], pub } = selectedPubMarker || {};
  const { latitude, longitude } = pub || { latitude: 0, longitude: 0 };

  // Calculate distance between user and pub using Haversine formula
  const distanceFromUser = useMemo(() => {
    // If we don't have user location or pub location, return null
    if (!userLatitude || !userLongitude || !latitude || !longitude) {
      return null;
    }

    // Haversine formula to calculate distance between two points on Earth
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);

    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(latitude - userLatitude);
    const dLon = toRadians(longitude - userLongitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(userLatitude)) *
        Math.cos(toRadians(latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    return distance;
  }, [latitude, longitude, userLatitude, userLongitude]);

  return (
    <div
      className={`pub-content ${isVisible ? "opacity-100" : "opacity-0"} transition-opacity duration-200 p-2 pt-8 h-full overflow-y-auto`}
    >
      {/* Header with pub name and sun icon */}
      <div className="flex flex-row items-center gap-4 mb-12">
        <div
          className="w-[50px] h-[50px] bg-white rounded-full flex items-center justify-center relative cursor-pointer"
          style={{
            ...(bestSunPercent >= 75
              ? { border: "2px solid #FFCC00" }
              : bestSunPercent >= 50
                ? {
                    // For the middle tier, we'll use a pseudo-element with a gradient
                    // The actual styling is handled in the :before pseudo-element
                    position: "relative",
                    border: "2px solid transparent",
                    backgroundClip: "padding-box",
                    boxSizing: "border-box",
                  }
                : { border: "2px solid #e5e7eb" }),
          }}
        >
          <DynamicSunIcon
            sunPercent={bestSunPercent}
            className="w-[25px] h-[25px]"
          />
        </div>
        <div className="flex flex-col">
          <h3 className="text-lg font-black font-poppins">{name}</h3>
          <p className="text-sm font-normal text-gray-600 font-poppins">
            {formatShortAddress(address_text)},{" "}
            {extractPostCodeFromAddress(address_text)}
          </p>
        </div>
      </div>

      {/* Best sun percentage summary */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-2">In the sun</h4>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <DynamicSunIcon
              sunPercent={bestSunPercent}
              className="w-[24px] h-[24px]"
            />
            <span className="font-medium">{bestSunPercent.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Pub areas section */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-2">Outdoor Areas</h4>

        {pubAreas && pubAreas.length > 0 ? (
          <div className="space-y-4">
            {pubAreas.map((area) => (
              <div key={area.id} className="bg-slate-50 p-3 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">
                    {formatAreaType(area.type)}
                  </span>
                  <div className="flex items-center gap-1">
                    <DynamicSunIcon
                      sunPercent={area.pc_in_sun}
                      className="w-[20px] h-[20px]"
                    />
                    <span className="text-sm font-medium">
                      {area.pc_in_sun.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  Area: {area.floor_area.toFixed(1)} m²
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No outdoor areas available</p>
        )}
      </div>

      {/* Distance from user */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-2">Location</h4>
        <div className="flex items-center gap-2">
          <span className="text-sm">Distance from you:</span>
          <span className="font-medium">
            {distanceFromUser !== null
              ? `${distanceFromUser.toFixed(1)} km`
              : "Location unavailable"}
          </span>
        </div>
      </div>
      {/* Close button */}
      <button
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mt-4"
        onClick={handleClose}
      >
        Close Pub View
      </button>
    </div>
  );
};

export default ViewPubDetails;
