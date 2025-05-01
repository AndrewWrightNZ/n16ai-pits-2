// Hooks
import usePubAreas from "../../areas/identifier/_shared/hooks/usePubAreas";
import useSunEvals from "../../../_shared/hooks/sunEvals/useSunEvals";

// Types
import { PubArea, Pub } from "../../../_shared/types";

// Icons
import { Sun } from "lucide-react";

export interface PubForDetailDisplay extends Pub {
  areas: PubArea[];
  totalArea: number;
  postcode: string;
  areaTypes: string[];
}

const PubDetail = () => {
  // Hooks
  const {
    data: { selectedPub },
    operations: { onSetSelectedPub },
  } = usePubAreas();

  const {
    data: { sunEvalsForTimeslot = [] },
  } = useSunEvals();

  console.log({ sunEvalsForTimeslot });

  if (!selectedPub) {
    return (
      <div className="min-h-screen w-[90vw] mx-auto pt-16 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Pub Not Found</h1>
        <p className="text-gray-600 mb-6">
          The pub you're looking for doesn't exist or has been removed.
        </p>
        <button
          onClick={() => {
            onSetSelectedPub(null);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Pubs List
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-[90vw] mx-auto pt-16">
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-6">
          <button
            onClick={() => {
              onSetSelectedPub(null);
            }}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back to Pubs List
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          {selectedPub.name}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-3">
              Location Details
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-2">
                <span className="font-medium">Address:</span>{" "}
                {selectedPub.address_text}
              </p>
              <p className="text-gray-700 mb-2">
                <span className="font-medium">Postcode:</span>{" "}
                {selectedPub.address_text}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Coordinates:</span>{" "}
                {selectedPub.latitude}, {selectedPub.longitude}
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-3">
              Area Information
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-2">
                <span className="font-medium">Total Area:</span>1000m2
              </p>
              <p className="text-gray-700 mb-2">
                <span className="font-medium">Area Types:</span> "bar area"
              </p>
              <div className="flex items-center">
                <span className="font-medium text-gray-700 mr-2">
                  Sunshine Rating:
                </span>
                <div className="flex flex-row items-center">
                  <Sun className="h-5 w-5 mr-1 text-amber-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">
            Areas Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
                  >
                    Size (m²)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
                  >
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-4 text-sm text-gray-500 text-center"
                  >
                    No area data available
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PubDetail;
