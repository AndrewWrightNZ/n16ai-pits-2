import { useMemo } from "react";

// Hooks
import usePubs from "../../../_shared/hooks/pubs/usePubs";
import usePubAreas from "../../../_shared/hooks/pubAreas/usePubAreas";

// Types
import { PubArea, Pub } from "../../../_shared/types";

// Components
import PubDetail from "./pubDetail";
import ExpandablePubRow from "./_shared/components/expandablePubRow";

// Helpers
import { extractPostCodeFromAddress } from "./_shared/helpers";

export interface PubForTableDisplay extends Pub {
  areas: PubArea[];
  totalArea: number;
  postcode: string;
  areaTypes: string[];
}

const PitsOneHundredPubsList = () => {
  // Hooks
  const {
    data: { allAvailableAreas, selectedPub },
  } = usePubAreas();

  const {
    data: { uiReadyPubs: pubsWithAreaDetails = [] },
  } = usePubs();

  // Add each areasOfTypes to the pubsWithAreaDetails and calculate total area
  const rankedPubs: PubForTableDisplay[] = useMemo(() => {
    const pubsWithAreasAndTotals = pubsWithAreaDetails.map((pub) => {
      const areas = allAvailableAreas.filter(({ pub_id }) => pub_id === pub.id);
      const totalArea = areas.reduce((sum, area) => sum + area.floor_area, 0);

      const postcode = extractPostCodeFromAddress(pub.address_text);

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
  }, [pubsWithAreaDetails, allAvailableAreas]);

  return (
    <>
      {selectedPub ? (
        <PubDetail />
      ) : (
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
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    View details
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
              Note: Area size is measured in square meters and represents the
              total outdoor space available.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default PitsOneHundredPubsList;
