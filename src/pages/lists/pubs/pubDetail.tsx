import { useState } from "react";

// Hooks
import useSunEvals from "../../../_shared/hooks/sunEvals/useSunEvals";

// Types
import { PubArea, Pub } from "../../../_shared/types";

// Icons
import { Sun } from "lucide-react";
import { extractPostCodeFromAddress, renderSunRating } from "./_shared/helpers";
import usePubAreas from "../../../_shared/hooks/pubAreas/usePubAreas";

export interface PubForDetailDisplay extends Pub {
  areas: PubArea[];
  totalArea: number;
  postcode: string;
  areaTypes: string[];
}

const PubDetail = () => {
  //

  // Hooks
  const {
    data: { selectedPub, areasForPub = [] },
    operations: { onSetSelectedPub },
  } = usePubAreas();

  const {
    data: { sunEvalsForTimeslot = [], sunEvalsForAllPubAreas = [] },
  } = useSunEvals();

  //

  // State
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredSunEval, setHoveredSunEval] = useState<any | null>(null);

  // Helper function to render sun evaluation for a specific area
  const renderSunEvaluation = (areaId: number) => {
    const sunEvalRightNow = sunEvalsForTimeslot.find(
      (sunEvalItem) => sunEvalItem.area_id === areaId
    );

    const sunEvalsForAreaThroughtTheDay = sunEvalsForAllPubAreas.filter(
      (sunEvalItem) => sunEvalItem.area_id === areaId
    );

    // Sort the evaluations by time to ensure proper order in visualization
    const sortedEvals = [...sunEvalsForAreaThroughtTheDay].sort(
      (a, b) => parseInt(a.time) - parseInt(b.time)
    );

    if (!sunEvalRightNow) {
      return <span className="text-gray-500">No data</span>;
    }

    // Determine sun rating based on percentage in sun
    const sunPercentage = sunEvalRightNow.pc_in_sun || 0;
    const currentTimeSlot = parseInt(sunEvalRightNow.time);

    // Create a visual representation based on percentage

    // Create the day timeline visualization
    const renderDayTimeline = () => {
      if (sortedEvals.length === 0) return null;

      return (
        <div className="flex flex-col mt-4 gap-4 w-full">
          <div className="text-xs text-gray-500">Sun throughout the day:</div>
          <div className="flex w-full h-6 bg-gray-100 rounded-md overflow-hidden relative">
            {sortedEvals.map((sunEval, index) => {
              const width = `${100 / sortedEvals.length}%`;
              const opacity = sunEval.pc_in_sun / 100;
              const isCurrentTime = parseInt(sunEval.time) === currentTimeSlot;

              const isHovered = hoveredIndex === index;

              return (
                <div
                  key={index}
                  className={`h-full ${isHovered ? "border-2 border-blue-500" : ""} relative`}
                  style={{
                    width,
                    backgroundColor: `rgba(251, 191, 36, ${opacity})`,
                    position: "relative",
                  }}
                  onMouseEnter={() => {
                    setHoveredIndex(index);
                    setHoveredSunEval(sunEval);
                  }}
                  onMouseLeave={() => {
                    setHoveredIndex(null);
                    setHoveredSunEval(null);
                  }}
                >
                  {isCurrentTime && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>12pm</span>
            <span>5pm</span>
            <span>9pm</span>
          </div>
        </div>
      );
    };

    return (
      <div>
        {hoveredSunEval && hoveredIndex !== null
          ? renderSunRating(
              hoveredSunEval.pc_in_sun,
              parseInt(hoveredSunEval.time)
            )
          : renderSunRating(sunPercentage)}
        {renderDayTimeline()}
      </div>
    );
  };

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
                {extractPostCodeFromAddress(selectedPub.address_text)}
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
                <span className="font-medium">Total Area:</span>{" "}
                {areasForPub
                  .reduce((total, area) => total + (area.floor_area || 0), 0)
                  .toFixed(2)}
                m²
              </p>
              <p className="text-gray-700 mb-2">
                <span className="font-medium">Area Types:</span>{" "}
                {Array.from(new Set(areasForPub.map((area) => area.type))).join(
                  ", "
                ) || "None"}
              </p>
              <div className="flex items-center">
                <span className="font-medium text-gray-700 mr-2">
                  Sunshine Rating:
                </span>
                <div className="flex flex-row items-center">
                  {sunEvalsForTimeslot.length > 0 ? (
                    <>
                      {/* Calculate average sun percentage across all areas */}
                      {(() => {
                        const pubAreas = areasForPub.map((area) => area.id);
                        const relevantEvals = sunEvalsForTimeslot.filter(
                          (sunEvalItem) =>
                            pubAreas.includes(sunEvalItem.area_id)
                        );

                        if (relevantEvals.length === 0) {
                          return (
                            <span className="text-gray-500">
                              No data available
                            </span>
                          );
                        }

                        const avgPercentage =
                          relevantEvals.reduce(
                            (sum, sunEvalItem) => sum + sunEvalItem.pc_in_sun,
                            0
                          ) / relevantEvals.length;

                        // Display suns based on average percentage
                        return (
                          <div className="flex items-center">
                            {avgPercentage >= 25 && (
                              <Sun className="h-5 w-5 mr-1 text-amber-500" />
                            )}
                            {avgPercentage >= 50 && (
                              <Sun className="h-5 w-5 mr-1 text-amber-500" />
                            )}
                            {avgPercentage >= 75 && (
                              <Sun className="h-5 w-5 mr-1 text-amber-500" />
                            )}
                            <span className="ml-1">
                              {avgPercentage.toFixed(1)}% average
                            </span>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <span className="text-gray-500">No data available</span>
                  )}
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
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
                  >
                    Sun right now
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {areasForPub.length > 0 ? (
                  areasForPub.map((area) => (
                    <tr key={area.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {area.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {area.floor_area ? area.floor_area.toFixed(2) : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {area.description || "No description available"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {renderSunEvaluation(area.id)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-sm text-gray-500 text-center"
                    >
                      No area data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PubDetail;
