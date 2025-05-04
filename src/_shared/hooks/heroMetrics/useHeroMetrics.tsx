// Hooks
import useSunEvals from "../sunEvals/useSunEvals";
import usePubs from "../../../pages/finder/_shared/hooks/usePubs";
import usePubAreas from "../pubAreas/usePubAreas";

// Constants
import { SUN_THRESHOLDS } from "../mapMarkers/useMapMarkers";

interface HeroMetricsResponse {
  data: {
    // Raw sun quality counts
    rawGoodSunCount: number;
    rawSomeSunCount: number;

    // Area counts
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
  const rawGoodSunCount = allMapReadyPubs.filter(
    (pub) => pub.bestSunPercent >= SUN_THRESHOLDS.GOOD
  ).length;
  const rawSomeSunCount = allMapReadyPubs.filter(
    (pub) =>
      pub.bestSunPercent >= SUN_THRESHOLDS.SOME &&
      pub.bestSunPercent < SUN_THRESHOLDS.GOOD
  ).length;

  return {
    data: {
      // Raw counts
      rawGoodSunCount,
      rawSomeSunCount,
    },
  };
};

export default useHeroMetrics;
