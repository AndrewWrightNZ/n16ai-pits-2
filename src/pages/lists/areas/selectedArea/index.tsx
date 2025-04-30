import { MapPin, Info, Square, X } from "lucide-react";
import usePubAreas from "../../../areas/identifier/_shared/hooks/usePubAreas";
import usePubs from "../../../finder/_shared/hooks/usePubs";

const ViewSelectedArea = () => {
  // Hooks
  const {
    data: { selectedPubArea },
    operations: { onSelectPubArea },
  } = usePubAreas();

  const {
    data: { pubs = [] },
  } = usePubs();

  // Variables
  const { name, description, type, floor_area, latitude, longitude, pub_id } =
    selectedPubArea || {};

  // Find the pub that owns this area
  const pub = pubs.find((p) => p.id === pub_id);

  // Format area type to be more readable
  const formatAreaType = (areaType: string) => {
    const types = {
      pavement: "Pavement",
      "frontage-seating": "Frontage Seating",
      terrace: "Terrace",
      "terrace-waterfront": "Waterfront Terrace",
      "beer-garden": "Beer Garden",
      courtyard: "Courtyard",
    };
    return types[areaType as keyof typeof types] || areaType;
  };

  const handleClose = () => {
    onSelectPubArea(null as any);
  };

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
      </div>
    </div>
  );
};

export default ViewSelectedArea;
