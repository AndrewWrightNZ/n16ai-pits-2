import { useMemo } from "react";

// Helpers
import { formatSunPercentage } from "../../../../../_shared/helpers";

// Types
import { SimplePubAreaWithSunPc } from "../../../../../_shared/hooks/mapMarkers/useMapMarkers";

// Helpers
import { formatAreaType } from "../../../../lists/_shared";

// Components
import DynamicSunIcon from "../../../../../_shared/components/dynamicSunIcon";

interface PubAreasOverviewProps {
  pubAreas: SimplePubAreaWithSunPc[];
}

const PubAreasOverview = ({ pubAreas }: PubAreasOverviewProps) => {
  //

  // Variables

  const orderedPubAreas = useMemo(() => {
    return [...pubAreas].sort((a, b) => b.pc_in_sun - a.pc_in_sun);
  }, [pubAreas]);

  console.log("orderedPubAreas", orderedPubAreas, pubAreas);

  // Render
  return (
    <div className="mb-6">
      <h4 className="text-md font-semibold mb-2">Outdoor Areas</h4>

      {orderedPubAreas && orderedPubAreas.length > 0 ? (
        <div className="space-y-4">
          {orderedPubAreas.map((area) => (
            <div key={area.id} className="bg-slate-50 p-3 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{formatAreaType(area.type)}</span>
                <div className="flex items-center gap-1">
                  <DynamicSunIcon
                    sunPercent={area.pc_in_sun}
                    className="w-[20px] h-[20px]"
                  />
                  <span className="text-sm font-medium">
                    {formatSunPercentage(area.pc_in_sun)}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Area: {area.floor_area.toFixed(1)} m²
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No outdoor areas available</p>
      )}
    </div>
  );
};

export default PubAreasOverview;
