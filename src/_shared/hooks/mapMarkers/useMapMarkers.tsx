// Types
import { Pub, PubArea } from "../../types";

// Hooks
import useSunEvals from "../sunEvals/useSunEvals";
import usePubs from "../../../pages/finder/_shared/hooks/usePubs";
import usePubAreas, { PubWithAreaAndSunEval } from "../pubAreas/usePubAreas";

export interface SimplePubAreaWithSunPc {
  id: number;
  type: string;
  pc_in_sun: number;
  floor_area: number;
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
    data: { sunEvalsForTimeslot = [], sunQualitySelected = [] },
  } = useSunEvals();

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
  const mapReadyMarkers = pubsInMapBounds.map((pub) => {
    const areasForPub = areasInMapBounds.filter(
      (area) => area.pub_id === pub.id
    );

    const pubAreas = areasForPub.map((area) => ({
      id: area.id,
      type: area.type,
      pc_in_sun: sunEvalLookup[area.id] || 0,
      floor_area: area.floor_area,
    }));

    const bestSunPercent =
      pubAreas.length > 0
        ? Math.max(...pubAreas.map((area) => area.pc_in_sun))
        : 0;

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
  });

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
      sunQualitySelected.includes("good") &&
      marker.bestSunPercent >= SUN_THRESHOLDS.GOOD
    )
      return true;
    if (
      sunQualitySelected.includes("some") &&
      marker.bestSunPercent >= SUN_THRESHOLDS.SOME &&
      marker.bestSunPercent < SUN_THRESHOLDS.GOOD
    )
      return true;
    if (
      sunQualitySelected.includes("no") &&
      marker.bestSunPercent < SUN_THRESHOLDS.SOME
    )
      return true;
    return false;
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
