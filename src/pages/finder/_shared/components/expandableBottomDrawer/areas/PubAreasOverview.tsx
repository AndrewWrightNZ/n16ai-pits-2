import { useMemo } from "react";

// Types
import { SimplePubAreaWithSunPc } from "../../../../../../_shared/hooks/mapMarkers/useMapMarkers";

// Components
import PubAreaRow from "./PubAreaRow";

interface PubAreasOverviewProps {
  pubAreas: SimplePubAreaWithSunPc[];
}

const PubAreasOverview = ({ pubAreas }: PubAreasOverviewProps) => {
  //

  // Variables
  const orderedPubAreas = useMemo(() => {
    return [...pubAreas].sort((a, b) => b.pc_in_sun - a.pc_in_sun);
  }, [pubAreas]);

  // Render
  return (
    <div className="mb-6">
      <h4 className="text-xs font-semibold mb-2">Outdoor Areas</h4>

      {orderedPubAreas && orderedPubAreas.length > 0 ? (
        <div className="space-y-2">
          {orderedPubAreas.map((area) => (
            <PubAreaRow key={area.id} area={area} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No outdoor areas available</p>
      )}
    </div>
  );
};

export default PubAreasOverview;
