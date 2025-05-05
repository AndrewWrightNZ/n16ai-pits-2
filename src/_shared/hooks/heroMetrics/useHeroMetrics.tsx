// Hooks
import usePubs from "../pubs/usePubs";
import useSunEvals from "../sunEvals/useSunEvals";
import usePubAreas from "../pubAreas/usePubAreas";

// Constants
import { MapReadyMarker, SUN_THRESHOLDS } from "../mapMarkers/useMapMarkers";

// Type for area count by type
interface AreaTypeCount {
  type: string;
  count: number;
}

interface HeroMetricsResponse {
  data: {
    // Raw sun quality counts
    goodSunCount: number;
    someSunCount: number;

    // Areas with sun above threshold
    areaTypeCountsWithSomeSun: AreaTypeCount[];

    // All map ready pubs
    allMapReadyPubs: MapReadyMarker[];
  };
}

const useHeroMetrics = (): HeroMetricsResponse => {
  //

  // Hooks
  const {
    data: { uiReadyPubs: allAvailablePubs = [] },
  } = usePubs();
  const {
    data: { allAvailableAreas = [] },
  } = usePubAreas();
  const {
    data: { sunEvalsForTimeslot = [] },
  } = useSunEvals();

  const allAreasAvailable = allAvailableAreas.filter((area) =>
    allAvailablePubs.some((pub) => pub.id === area.pub_id)
  );

  // Create a lookup map for sun evaluations to avoid repeated find operations
  const sunEvalLookup = Object.fromEntries(
    sunEvalsForTimeslot.map((sunEval) => [
      sunEval.area_id,
      sunEval.pc_in_sun || 0,
    ])
  );

  const allMapReadyPubs = allAvailablePubs.map((pub) => {
    const areasForPub = allAreasAvailable.filter(
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

  // Count raw markers by sun quality using filter instead of multiple reduces
  const rawGoodSunPubs = allMapReadyPubs.filter(
    (pub) => pub.bestSunPercent >= SUN_THRESHOLDS.GOOD
  );
  const goodSunCount = rawGoodSunPubs.length;

  const rawSomeSunPubs = allMapReadyPubs.filter(
    (pub) =>
      pub.bestSunPercent >= SUN_THRESHOLDS.SOME &&
      pub.bestSunPercent < SUN_THRESHOLDS.GOOD
  );

  const someSunCount = rawSomeSunPubs.length;

  // Get all pub areas with sun evaluation above SOME threshold
  const areasWithSomeSun = allMapReadyPubs.flatMap((pub) =>
    pub.pubAreas.filter((area) => area.pc_in_sun >= SUN_THRESHOLDS.SOME)
  );

  // Create an array of objects with type and count of areas of that type
  const areaTypeCountsWithSomeSun = areasWithSomeSun.reduce<AreaTypeCount[]>(
    (acc, area) => {
      // Find if this type already exists in our accumulator
      const existingTypeIndex = acc.findIndex(
        (item) => item.type === area.type
      );

      if (existingTypeIndex >= 0) {
        // If type exists, increment the count
        acc[existingTypeIndex].count++;
      } else {
        // If type doesn't exist, add a new entry
        acc.push({ type: area.type, count: 1 });
      }

      return acc;
    },
    []
  );

  return {
    data: {
      // Raw counts
      goodSunCount,
      someSunCount,

      // Areas with sun above threshold
      areaTypeCountsWithSomeSun,

      // All map ready pubs
      allMapReadyPubs,
    },
  };
};

export default useHeroMetrics;
