import { MapPin, Info, Square, X, Sun } from "lucide-react";

// Hooks
import usePubs from "../../../finder/_shared/hooks/usePubs";
import useSunEvals from "../../../../_shared/hooks/sunEvals/useSunEvals";
import usePubAreas from "../../../areas/identifier/_shared/hooks/usePubAreas";

// Helpers
import { formatAreaType, formatTimeLabel } from "../../_shared";

const ViewSelectedArea = () => {
  // Hooks
  const {
    data: { selectedPubArea },
    operations: { onSelectPubArea },
  } = usePubAreas();

  const {
    data: { pubs = [] },
  } = usePubs();

  const {
    data: { sunEvalsForPubArea = [] },
  } = useSunEvals();

  // Variables
  const { name, description, type, floor_area, latitude, longitude, pub_id } =
    selectedPubArea || {};

  // Find the pub that owns this area
  const pub = pubs.find((p) => p.id === pub_id);

  const handleClose = () => {
    onSelectPubArea(null as any);
  };

  // Filter out negative values for display purposes
  const validSunEvals = sunEvalsForPubArea.filter(
    (sunData) => sunData.pc_in_sun >= 0
  );

  // Find the maximum percentage for scaling
  const maxPercentage = Math.max(
    ...validSunEvals.map((sunData) => sunData.pc_in_sun),
    100
  );

  return (
    <div className="relative">
      <button
        onClick={handleClose}
        className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-blue-600">{name}</h2>
            <p className="text-sm text-gray-500">
              {pub?.name || "Unknown Pub"}
            </p>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {formatAreaType(type || "")}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-700">Description</h3>
              <p className="text-gray-600">
                {description || "No description available"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Square className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-700">Floor Area</h3>
              <p className="text-gray-600">
                {floor_area ? `${floor_area.toFixed(2)} m²` : "Not measured"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-700">Location</h3>
              <p className="text-gray-600">
                {latitude && longitude
                  ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                  : "Location not set"}
              </p>
            </div>
          </div>
        </div>

        {/* Sun Evaluation Visualization */}
        {validSunEvals.length > 0 && (
          <div className="mt-6">
            <div className="flex items-start gap-2 mb-3">
              <Sun className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  Sun Exposure
                </h3>
                <p className="text-gray-600">
                  Percentage of area in sunlight throughout the day
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              {/* Horizontal bar chart - rotated 90 degrees */}
              <div className="space-y-3">
                {/* Y-axis label */}
                <div className="text-xs text-gray-500 mb-1 text-center">
                  <span>Percentage in Sun</span>
                </div>

                {/* Visualization */}
                {validSunEvals
                  .sort((a, b) => Number(a.time) - Number(b.time))
                  .map((sunData) => (
                    <div key={sunData.id} className="flex items-center gap-2">
                      <div className="w-14 text-xs text-gray-600">
                        {formatTimeLabel(Number(sunData.time))}
                      </div>
                      <div className="flex-1 bg-gray-200 h-8 rounded-md relative overflow-hidden">
                        <div
                          className="bg-yellow-400 h-full rounded-md"
                          style={{
                            width: `${Math.max(
                              5,
                              Math.floor(
                                (Number(sunData.pc_in_sun) /
                                  Number(maxPercentage)) *
                                  100
                              )
                            )}%`,
                            boxShadow: "0 0 0 1px rgba(0,0,0,0.1) inset",
                          }}
                        />
                      </div>
                      <div className="w-14 text-xs text-gray-600 text-right">
                        {sunData.pc_in_sun.toFixed(1)}%
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewSelectedArea;
