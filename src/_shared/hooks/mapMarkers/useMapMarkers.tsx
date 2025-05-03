// Types
import { Pub, PubArea } from "../../types";

// Hooks
import usePubAreas, { PubWithAreaAndSunEval } from "../pubAreas/usePubAreas";
import usePubs from "../../../pages/finder/_shared/hooks/usePubs";
import useSunEvals from "../sunEvals/useSunEvals";

export interface SimplePubAreaWithSunPc {
  id: number;
  type: string;
  pc_in_sun: number;
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
    //

    // Total available areas and pubs
    totalPubsInView: Pub[];
    totalAreasInView: PubArea[];

    //

    // Map ready markers
    mapReadyMarkers: MapReadyMarker[];
    filteredBySunQualityMarkers: MapReadyMarker[];

    //

    // Simple sun quality counts
    goodSunCount: number;
    someSunCount: number;
    noSunCount: number;

    //

    // Pubs and PubAreas filtered by Sun Quality and PubAreaType

    // Categorized pubs by sun evaluation
    pubsWithSunEvalAbove75: PubWithAreaAndSunEval[];
    pubsWithSunEvalAbove50Below75: PubWithAreaAndSunEval[];
    pubsWithoutSunEvalAbove50Percent: PubWithAreaAndSunEval[];
  };
}

const useMapMarkers = (): MapMarkersResponse => {
  //

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

  //

  // Variables
  const areasInMapBounds = allAvailableAreas.filter((area) => {
    return pubsInMapBounds.some((pub) => pub.id === area.pub_id);
  });

  const mapReadyMarkers = pubsInMapBounds.map((pub) => {
    const areasForPub = areasInMapBounds.filter(
      (area) => area.pub_id === pub.id
    );

    return {
      pub: {
        id: pub.id,
        name: pub.name,
        latitude: pub.latitude,
        longitude: pub.longitude,
      },
      pubAreas: areasForPub.map((area) => {
        return {
          id: area.id,
          type: area.type,
          pc_in_sun:
            sunEvalsForTimeslot.find((sunEval) => sunEval.area_id === area.id)
              ?.pc_in_sun || 0,
        };
      }),
      bestSunPercent: Math.max(
        ...areasForPub.map(
          (area) =>
            sunEvalsForTimeslot.find((sunEval) => sunEval.area_id === area.id)
              ?.pc_in_sun || 0
        )
      ),
    };
  });

  const goodSunCount = mapReadyMarkers.reduce((acc, marker) => {
    if (marker.bestSunPercent >= 75) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const someSunCount = mapReadyMarkers.reduce((acc, marker) => {
    if (marker.bestSunPercent >= 50 && marker.bestSunPercent < 75) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const noSunCount = mapReadyMarkers.reduce((acc, marker) => {
    if (marker.bestSunPercent < 50) {
      return acc + 1;
    }
    return acc;
  }, 0);

  let filteredBySunQualityMarkers: MapReadyMarker[] = [];

  if (sunQualitySelected.includes("good")) {
    const goodSunMarkers = mapReadyMarkers.filter((marker) => {
      return marker.bestSunPercent >= 75;
    });

    filteredBySunQualityMarkers = [
      ...filteredBySunQualityMarkers,
      ...goodSunMarkers,
    ];
  }

  if (sunQualitySelected.includes("some")) {
    const someSunMarkers = mapReadyMarkers.filter((marker) => {
      return marker.bestSunPercent >= 50 && marker.bestSunPercent < 75;
    });

    filteredBySunQualityMarkers = [
      ...filteredBySunQualityMarkers,
      ...someSunMarkers,
    ];
  }

  if (sunQualitySelected.includes("no")) {
    const noSunMarkers = mapReadyMarkers.filter((marker) => {
      return marker.bestSunPercent < 50;
    });

    filteredBySunQualityMarkers = [
      ...filteredBySunQualityMarkers,
      ...noSunMarkers,
    ];
  }

  return {
    data: {
      // Totals
      totalPubsInView: pubsInMapBounds,
      totalAreasInView: areasInMapBounds,

      // Categorized pubs by sun evaluation
      pubsWithSunEvalAbove75: [],
      pubsWithSunEvalAbove50Below75: [],
      pubsWithoutSunEvalAbove50Percent: [],

      // Simple sun quality counts
      goodSunCount,
      someSunCount,
      noSunCount,

      // Map ready markers
      mapReadyMarkers,

      // Filtered by sun quality
      filteredBySunQualityMarkers,
    },
  };
};

export default useMapMarkers;
