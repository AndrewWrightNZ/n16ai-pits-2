import { useMemo } from "react";

// Hooks
import usePubs from "../../finder/_shared/hooks/usePubs";
import usePubAreas from "../../areas/identifier/_shared/hooks/usePubAreas";

const PitsOneHundredPubsList = () => {
  // Hooks
  const {
    data: { areasOfTypes },
  } = usePubAreas();

  const {
    data: { uiReadyPubs: pubsWithAreaDetails = [] },
  } = usePubs();

  // Add each areasOfTypes to the pubsWithAreaDetails and calculate total area
  const rankedPubs = useMemo(() => {
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

  // Format area size to 2 decimal places
  const formatAreaSize = (size: any) => {
    return size.toFixed(2);
  };

  // Format area types for display
  const formatAreaTypes = (types: any) => {
    if (!types || types.length === 0) return "None";

    return types
      .map((type: any) =>
        type
          .split("-")
          .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      )
      .join(", ");
  };

  return (
    <div id="pubs-list" className="bg-white min-h-screen w-full py-16">
      <div className="px-4 mx-auto w-full">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8">
          London's Top Pubs in the Sun
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Ranked by total outdoor area size (in square meters)
        </p>

        <div className="overflow-x-auto shadow-md rounded-lg w-full">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Rank
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Pub Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Postcode
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Address
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Total Area (m²)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Area Types
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rankedPubs.map((pub, index) => (
                <tr
                  key={pub.id}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {pub.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pub.postcode}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                    {pub.address_text}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                    {formatAreaSize(pub.totalArea)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatAreaTypes(pub.areaTypes)}
                  </td>
                </tr>
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
    </div>
  );
};

export default PitsOneHundredPubsList;
