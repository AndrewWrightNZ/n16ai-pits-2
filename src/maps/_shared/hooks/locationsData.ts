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
  sanFrancisco: {
    lat: 37.7749,
    lng: -122.4194,
    altitude: 500,
    heading: 0,
    description: "San Francisco",
  },
  newYork: {
    lat: 40.7128,
    lng: -74.006,
    altitude: 500,
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
