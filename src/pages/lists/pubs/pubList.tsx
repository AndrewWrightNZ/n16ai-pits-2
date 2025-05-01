import { useMemo } from "react";

// Hooks
import usePubs from "../../finder/_shared/hooks/usePubs";
import usePubAreas from "../../areas/identifier/_shared/hooks/usePubAreas";
import useSunEvals from "../../../_shared/hooks/sunEvals/useSunEvals";

// Types
import { PubArea, Pub } from "../../../_shared/types";
import ExpandablePubRow from "./_shared/components/expandablePubRow";

export interface PubForTableDisplay extends Pub {
  areas: PubArea[];
  totalArea: number;
  postcode: string;
  areaTypes: string[];
}

const PitsOneHundredPubsList = () => {
  // Hooks
  const {
    data: { areasOfTypes },
  } = usePubAreas();

  const {
    data: { uiReadyPubs: pubsWithAreaDetails = [] },
  } = usePubs();

  const {
    data: { sunEvalsForTimeslot = [] },
  } = useSunEvals();

  // Add each areasOfTypes to the pubsWithAreaDetails and calculate total area
  const rankedPubs: PubForTableDisplay[] = useMemo(() => {
    const pubsWithAreasAndTotals = pubsWithAreaDetails.map((pub) => {
      const areas = areasOfTypes.filter(({ pub_id }) => pub_id === pub.id);
      const totalArea = areas.reduce((sum, area) => sum + area.floor_area, 0);

      // Extract postcode from address
      const postcode =
        pub.address_text.match(
          /([A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2})/
        )?.[0] || "N/A";

      // Create array of unique area types
      const areaTypes = [...new Set(areas.map((area) => area.type))];

      return {
        ...pub,
        areas,
        totalArea,
        postcode,
        areaTypes,
      };
    });

    // Sort by total area (descending)
    return [...pubsWithAreasAndTotals].sort(
      (a, b) => b.totalArea - a.totalArea
    );
  }, [pubsWithAreaDetails, areasOfTypes]);

  console.log({ sunEvalsForTimeslot });

  return (
    <div id="pubs-list" className="min-h-screen w-[90vw] mx-auto pt-16">
      <div className="overflow-x-auto shadow-md rounded-lg w-full rounded-2xl bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 whitespace-nowrap">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
              >
                Rank
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
              >
                Pub Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
              >
                Location
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
              >
                Postcode
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
              >
                Total Area (m²)
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Area Types
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Sunshine
              </th>
            </tr>
          </thead>
          <tbody className="whitespace-nowrap bg-white divide-y divide-gray-200">
            {rankedPubs.map((pub, index) => (
              <ExpandablePubRow key={pub.id} pub={pub} index={index} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p>Total pubs displayed: {rankedPubs.length}</p>
        <p className="mt-2">
          Note: Area size is measured in square meters and represents the total
          outdoor space available.
        </p>
      </div>
    </div>
  );
};

export default PitsOneHundredPubsList;
