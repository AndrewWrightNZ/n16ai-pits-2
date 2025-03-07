// Location type definition
export interface PresetLocation {
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  description: string;
}

export const PRESET_LOCATIONS: Record<string, PresetLocation> = {
  london: {
    lat: 51.5074,
    lng: -0.1278,
    altitude: 500,
    heading: 0,
    description: "London",
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
