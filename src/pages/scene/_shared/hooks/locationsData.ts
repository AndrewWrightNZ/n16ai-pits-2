// Location type definition
export interface PresetLocation {
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  description: string;
  // Add the new camera properties
  tilt?: number;
  position?: { x: number; y: number; z: number };
  target?: { x: number; y: number; z: number };
  distance?: number;
}

export const PRESET_LOCATIONS: Record<string, PresetLocation> = {
  london: {
    lat: 51.5074,
    lng: -0.1278,
    altitude: 182, // Updated to match the y position of the camera
    heading: 25.37, // Updated from the new camera data
    description: "London",
    // Add the new camera data
    tilt: -42.93,
    position: { x: 37.38, y: 182.01, z: 106.55 },
    target: { x: -55.38, y: 0.0, z: -89.07 },
    distance: 282.84,
  },
  london_two: {
    lat: 51.5074,
    lng: -0.1278,
    altitude: 217.19,
    heading: 236.46,
    tilt: -50.16,
    distance: 282.84,
    position: {
      x: 83.54,
      y: 217.19,
      z: -27.29,
    },
    target: {
      x: -67.48,
      y: 0,
      z: 72.82,
    },
    description: "My Location",
  },
  devonshire: {
    lat: 51.5074,
    lng: -0.1278,
    altitude: 151.08,
    heading: 223.29,
    tilt: -53.62,
    distance: 187.64,
    position: {
      x: 400.73,
      y: 151.08,
      z: -565.55,
    },
    target: {
      x: 324.42,
      y: 0,
      z: -484.55,
    },
    description: "The Devonshire",
  },
  lady_mildmay: {
    lat: 51.5507, // Geographic latitude
    lng: -0.0845763, // Geographic longitude
    altitude: 179.57,
    heading: 0,
    description: "Lady Mildmay",
    // Camera position details
    position: {
      x: 62.68,
      y: 179.57,
      z: -73.2,
    },
    target: {
      x: -36.43,
      y: 0,
      z: 40.59,
    },
  },
  canonbury_tavern: {
    lat: 51.5447, // Geographic latitude
    lng: -0.0975854, // Geographic longitude
    altitude: 210.05,
    heading: 0,
    description: "Canonbury Tavern",
    // Camera position details
    position: {
      x: -46.42,
      y: 210.05,
      z: 105.29,
    },
    target: {
      x: 40.83,
      y: 0,
      z: -71.33,
    },
  },
  sanFrancisco: {
    lat: 37.7749,
    lng: -122.4194,
    altitude: 182,
    heading: 10,
    description: "San Francisco",
  },
  newYork: {
    lat: 40.7128,
    lng: -74.006,
    altitude: 182,
    heading: 45,
    description: "New York",
  },
  paris: {
    lat: 48.8566,
    lng: 2.3522,
    altitude: 500,
    heading: 30,
    description: "Paris",
  },
  tokyo: {
    lat: 35.6762,
    lng: 139.6503,
    altitude: 500,
    heading: 0,
    description: "Tokyo",
  },
};

// This function converts camera position data to the PresetLocation format
// Add this to your code where you handle location presets

/**
 * Converts camera position data to PresetLocation format
 *
 * @param cameraData Object containing position and target coordinates
 * @param description Optional description for the location
 * @param geoCoordinates Optional {lat, lng} if you have them
 * @returns PresetLocation object formatted for your PRESET_LOCATIONS array
 */
export function convertCameraToPresetLocation(
  cameraData: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
  },
  description: string = "New Location",
  geoCoordinates?: { lat: number; lng: number }
): PresetLocation {
  // Calculate heading (angle in XZ plane)
  const calculateHeading = (position: any, target: any) => {
    const dx = target.x - position.x;
    const dz = target.z - position.z;

    // Heading is the angle from North (negative Z) clockwise
    let heading = Math.atan2(dx, -dz) * (180 / Math.PI);

    // Normalize to 0-360 degrees
    if (heading < 0) {
      heading += 360;
    }

    return heading;
  };

  // Calculate tilt (angle from horizontal plane)
  const calculateTilt = (position: any, target: any) => {
    const dx = target.x - position.x;
    const dz = target.z - position.z;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);

    const dy = target.y - position.y;

    // Tilt is the angle from horizontal plane
    let tilt = Math.atan2(dy, horizontalDistance) * (180 / Math.PI);

    return tilt;
  };

  // Calculate distance between position and target
  const calculateDistance = (position: any, target: any) => {
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const dz = target.z - position.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  // Calculate the properties
  const heading = calculateHeading(cameraData.position, cameraData.target);
  const tilt = calculateTilt(cameraData.position, cameraData.target);
  const distance = calculateDistance(cameraData.position, cameraData.target);

  // Create the preset location object
  return {
    // Use provided geo coordinates if available, or defaults if not
    lat: geoCoordinates?.lat || 0,
    lng: geoCoordinates?.lng || 0,

    // The altitude is the y position of the camera
    altitude: parseFloat(cameraData.position.y.toFixed(2)),

    // Calculated orientation values
    heading: parseFloat(heading.toFixed(2)),
    tilt: parseFloat(tilt.toFixed(2)),
    distance: parseFloat(distance.toFixed(2)),

    // Original position and target data
    position: {
      x: parseFloat(cameraData.position.x.toFixed(2)),
      y: parseFloat(cameraData.position.y.toFixed(2)),
      z: parseFloat(cameraData.position.z.toFixed(2)),
    },
    target: {
      x: parseFloat(cameraData.target.x.toFixed(2)),
      y: parseFloat(cameraData.target.y.toFixed(2)),
      z: parseFloat(cameraData.target.z.toFixed(2)),
    },

    // Location description
    description,
  };
}
