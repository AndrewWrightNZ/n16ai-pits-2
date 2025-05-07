import DynamicSunIcon from "../../../../../_shared/components/dynamicSunIcon";
import { MapReadyMarker } from "../../../../../_shared/hooks/mapMarkers/useMapMarkers";
import { useGeoLocationContext } from "../../../../../_shared/providers/useGeolocationContext";
import { useMemo } from "react";
import { formatAreaType } from "../../../../lists/_shared";

interface PubListRowProps {
  marker: MapReadyMarker;
}

// Utility function to calculate distance between two coordinates in kilometers
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Utility function to format distance
const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};

const PubListRow = ({ marker }: PubListRowProps) => {
  const { geoLocationState } = useGeoLocationContext();
  const { userLatitude, userLongitude } = geoLocationState;

  // Calculate distance from user to pub
  const distance = useMemo(() => {
    if (userLatitude && userLongitude) {
      return calculateDistance(
        userLatitude,
        userLongitude,
        marker.pub.latitude,
        marker.pub.longitude
      );
    }
    return null;
  }, [userLatitude, userLongitude, marker.pub.latitude, marker.pub.longitude]);

  return (
    <div className="flex flex-col gap-2 w-full border-b border-slate-200 pb-4 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DynamicSunIcon sunPercent={marker.bestSunPercent} />
          <p className="font-black font-poppins">{marker.pub.name}</p>
        </div>
        {distance !== null && (
          <p className="text-xs font-normal text-slate-600">
            {formatDistance(distance)}
          </p>
        )}
      </div>

      {/* Best sun percentage */}
      <div className="flex items-center gap-2 mt-1">
        <div className="w-20 bg-gray-200 rounded-full h-2">
          <div
            className="bg-yellow-400 h-2 rounded-full"
            style={{ width: `${marker.bestSunPercent}%` }}
          ></div>
        </div>
        <p className="text-xs font-medium">
          {marker.bestSunPercent.toFixed(0)}% sun
        </p>
      </div>

      {/* Area names */}
      <div className="mt-1">
        <div className="flex flex-wrap gap-1">
          {marker.pubAreas.map((area) => (
            <span
              key={area.id}
              className="text-xs bg-slate-100 px-2 py-1 rounded-md flex items-center gap-1"
            >
              <span>{formatAreaType(area.type)}</span>
              <span className="text-slate-500">
                {area.pc_in_sun.toFixed(0)}% sun
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PubListRow;
