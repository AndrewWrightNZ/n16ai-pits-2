// Types
import { Pub, PubArea } from "../../types";

// Hooks
import usePubs from "../pubs/usePubs";
import useSunEvals from "../sunEvals/useSunEvals";
import usePubAreas, { PubWithAreaAndSunEval } from "../pubAreas/usePubAreas";
import useFilters from "../filters/useFilters";
import { AreaType, SunQuality } from "../../providers/FiltersProvider";

export interface SimplePubAreaWithSunPc {
  id: number;
  type: string;
  pc_in_sun: number;
  floor_area: number;
  pub_id?: number;
}

export interface MapReadyMarker {
  pub: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
  };
  pubAreas: SimplePubAreaWithSunPc[];
  bestSunPercent: number;
}

interface MapMarkersResponse {
  data: {
    // Total available areas and pubs
    totalPubsInView: Pub[];
    totalAreasInView: PubArea[];

    // Map ready markers
    mapReadyMarkers: MapReadyMarker[];
    filteredBySunQualityMarkers: MapReadyMarker[];

    // Simple sun quality counts
    goodSunCount: number;
    someSunCount: number;
    noSunCount: number;

    // Categorized pubs by sun evaluation
    pubsWithSunEvalAbove75: PubWithAreaAndSunEval[];
    pubsWithSunEvalAbove50Below75: PubWithAreaAndSunEval[];
    pubsWithoutSunEvalAbove50Percent: PubWithAreaAndSunEval[];
  };
}

// Sun quality thresholds
export const SUN_THRESHOLDS = {
  GOOD: 75,
  SOME: 50,
};

const useMapMarkers = (): MapMarkersResponse => {
  // Hooks
  const {
    data: { pubsInMapBounds = [] },
  } = usePubs();
  const {
    data: { allAvailableAreas = [] },
  } = usePubAreas();
  const {
    data: { sunEvalsForTimeslot = [] },
  } = useSunEvals();

  const {
    data: { sunQualityFilters = [], areaTypeFilters = [] },
  } = useFilters();

  // Filter areas to only those that belong to pubs in map bounds
  const areasInMapBounds = allAvailableAreas.filter((area) =>
    pubsInMapBounds.some((pub) => pub.id === area.pub_id)
  );

  // Create a lookup map for sun evaluations to avoid repeated find operations
  const sunEvalLookup = Object.fromEntries(
    sunEvalsForTimeslot.map((sunEval) => [
      sunEval.area_id,
      sunEval.pc_in_sun || 0,
    ])
  );

  // Create map-ready markers with optimized lookups
  const mapReadyMarkers = pubsInMapBounds
    .map((pub) => {
      const areasForPub = areasInMapBounds.filter(
        ({ pub_id, type }) =>
          pub_id === pub.id && areaTypeFilters.includes(type as AreaType)
      );

      // Only include areas that have a sun evaluation (pc_in_sun >= 0)
      const pubAreas = areasForPub
        .map((area) => {
          const sunPercentage =
            sunEvalLookup[area.id] !== undefined ? sunEvalLookup[area.id] : -1;
          return {
            id: area.id,
            type: area.type,
            pc_in_sun: sunPercentage,
            floor_area: area.floor_area,
          };
        })
        .filter((area) => area.pc_in_sun >= 0); // Only include areas with sun evaluations

      const bestSunPercent =
        pubAreas.length > 0
          ? Math.max(...pubAreas.map((area) => area.pc_in_sun))
          : 0;

      // Only return the pub if it has at least one area with a sun evaluation
      if (pubAreas.length === 0) {
        return null; // This pub has no areas with sun evaluations
      }

      return {
        pub: {
          id: pub.id,
          name: pub.name,
          latitude: pub.latitude,
          longitude: pub.longitude,
        },
        pubAreas,
        bestSunPercent,
      };
    })
    .filter(Boolean) as MapReadyMarker[]; // Filter out null values

  // Count markers by sun quality using filter instead of multiple reduces
  const goodSunCount = mapReadyMarkers.filter(
    (marker) => marker.bestSunPercent >= SUN_THRESHOLDS.GOOD
  ).length;
  const someSunCount = mapReadyMarkers.filter(
    (marker) =>
      marker.bestSunPercent >= SUN_THRESHOLDS.SOME &&
      marker.bestSunPercent < SUN_THRESHOLDS.GOOD
  ).length;
  const noSunCount = mapReadyMarkers.filter(
    (marker) => marker.bestSunPercent < SUN_THRESHOLDS.SOME
  ).length;

  // Filter markers by selected sun quality in a single operation
  const filteredBySunQualityMarkers = mapReadyMarkers.filter((marker) => {
    if (
      sunQualityFilters.includes(SunQuality.GOOD) &&
      marker.bestSunPercent >= SUN_THRESHOLDS.GOOD
    )
      return true;
    if (
      sunQualityFilters.includes(SunQuality.SOME) &&
      marker.bestSunPercent >= SUN_THRESHOLDS.SOME &&
      marker.bestSunPercent < SUN_THRESHOLDS.GOOD
    )
      return true;
    if (
      sunQualityFilters.includes(SunQuality.NO) &&
      marker.bestSunPercent < SUN_THRESHOLDS.SOME
    )
      return true;
    return false;
  });

  console.log("filteredBySunQualityMarkers", {
    filteredBySunQualityMarkers,
  });

  return {
    data: {
      // Totals
      totalPubsInView: pubsInMapBounds,
      totalAreasInView: areasInMapBounds,

      // Categorized pubs by sun evaluation
      pubsWithSunEvalAbove75: [],
      pubsWithSunEvalAbove50Below75: [],
      pubsWithoutSunEvalAbove50Percent: [],

      // Counts in map bounds
      goodSunCount,
      someSunCount,
      noSunCount,

      // Map ready markers
      mapReadyMarkers,
      filteredBySunQualityMarkers,
    },
  };
};

export default useMapMarkers;
