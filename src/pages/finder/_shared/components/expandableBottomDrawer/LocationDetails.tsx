import { useMemo } from "react";

// Hooks
import usePubAreas from "../../../../../_shared/hooks/pubAreas/usePubAreas";
import useUserGeoLocation from "../../../../../_shared/hooks/user/useGeolocation";

const LcoationDteails = () => {
  //

  // Hooks
  const {
    data: { userLatitude, userLongitude },
  } = useUserGeoLocation();

  // Hooks
  const {
    data: { selectedPub },
  } = usePubAreas();
  //

  // Variables
  const { latitude, longitude } = selectedPub || {};

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

  //

  // Format to meters if under 1km
  const distanceFromUserFormatted = useMemo(() => {
    if (distanceFromUser !== null) {
      return distanceFromUser > 1
        ? `${distanceFromUser.toFixed(1)}km`
        : `${(distanceFromUser * 1000).toFixed(0)}m`;
    }
    return "Location unavailable";
  }, [distanceFromUser]);

  if (!distanceFromUser) {
    return <></>;
  }

  return (
    <div className="mb-6 text-xs mb-16">
      <h4 className="font-semibold mb-2 font-poppins">Location</h4>
      <div className="flex flex-col items-start justify-between bg-slate-50 p-3 rounded-md text-xs gap-2">
        <p className="font-bold">Distance from you</p>
        <p className="font-medium">{distanceFromUserFormatted}</p>
      </div>
    </div>
  );
};

export default LcoationDteails;
