import { MapPin, Info, Square, X, Sun, Clock } from "lucide-react";

// Hooks
import usePubs from "../../../finder/_shared/hooks/usePubs";
import useSunEvals from "../../../../_shared/hooks/sunEvals/useSunEvals";

// Helpers
import { formatAreaType, formatTimeLabel } from "../../_shared";
import usePubAreas from "../../../../_shared/hooks/pubAreas/usePubAreas";

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
              {/* Sun intensity timeline bar */}
              {validSunEvals.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div className="text-xs text-gray-600 font-medium">
                      Sun intensity throughout the day
                    </div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded-md overflow-hidden flex relative">
                    {validSunEvals
                      .sort((a, b) => Number(a.time) - Number(b.time))
                      .map((sunData, index, array) => {
                        // Calculate segment width based on time distribution
                        const segmentWidth = 100 / array.length;

                        // Determine opacity based on sun intensity percentage
                        const intensity = Number(sunData.pc_in_sun) / 100;

                        // Use a single golden-yellow color with varying opacity
                        // Base color: rgb(250, 200, 50) - a warm golden yellow
                        // Minimum opacity: 0.15 (so even low values are visible)
                        // Maximum opacity: 0.95
                        const opacity = 0.15 + intensity * 0.8;
                        const color = `rgba(250, 200, 50, ${opacity.toFixed(2)})`;

                        return (
                          <div
                            key={`timeline-${sunData.id}`}
                            className="h-full relative cursor-pointer"
                            style={{
                              width: `${segmentWidth}%`,
                              backgroundColor: color,
                              position: "relative",
                            }}
                            onMouseEnter={(e) => {
                              // Create and position tooltip
                              const tooltip = document.createElement("div");
                              tooltip.className = "sun-tooltip";
                              tooltip.textContent = `${formatTimeLabel(Number(sunData.time))}: ${sunData.pc_in_sun.toFixed(1)}% in sun`;
                              tooltip.style.position = "absolute";
                              tooltip.style.backgroundColor =
                                "rgba(0, 0, 0, 0.8)";
                              tooltip.style.color = "white";
                              tooltip.style.padding = "4px 8px";
                              tooltip.style.borderRadius = "4px";
                              tooltip.style.fontSize = "12px";
                              tooltip.style.zIndex = "50";
                              tooltip.style.whiteSpace = "nowrap";
                              tooltip.style.pointerEvents = "none";

                              // Append to body and position
                              document.body.appendChild(tooltip);
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
                              tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                            }}
                            onMouseLeave={() => {
                              // Remove all tooltips
                              document
                                .querySelectorAll(".sun-tooltip")
                                .forEach((el) => el.remove());
                            }}
                          >
                            {index % 2 === 0 && (
                              <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                                {formatTimeLabel(Number(sunData.time))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                  <div className="flex justify-between mt-6 text-xs text-gray-500">
                    <span>Low Sun Intensity</span>
                    <span>High Sun Intensity</span>
                  </div>
                </div>
              )}

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
