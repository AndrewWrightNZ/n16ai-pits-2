// Hooks
import useSunEvals from "../../../../_shared/hooks/sunEvals/useSunEvals";

// Helpers
import { formatAreaType } from "../../_shared";

// Icons
import { Sun } from "lucide-react";

interface AreaTableRowProps {
  area: any;
  index: number;
  selectedPubArea: any;
  onSelectPubArea: (area: any) => void;
}
const AreaTableRow = ({
  area,
  index,
  selectedPubArea,
  onSelectPubArea,
}: AreaTableRowProps) => {
  //

  // Hooks
  const {
    data: { sunEvalsForTimeslot },
  } = useSunEvals();

  //

  // Variables

  const sunEval =
    sunEvalsForTimeslot.find(({ area_id }) => area_id === area.id) || null;

  const { pc_in_sun } = sunEval || {};

  return (
    <tr
      key={area.id || index}
      className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedPubArea?.id === area.id ? "bg-blue-50" : ""}`}
      onClick={() => onSelectPubArea(area)}
    >
      {[
        area.pub_name,
        area.name,
        area.type,
        area.description,
        area.floor_area?.toFixed(2),
        area.latitude?.toFixed(4),
        area.longitude?.toFixed(4),
      ].map((value, idx) => (
        <td
          key={idx}
          className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 truncate"
        >
          {idx === 2 ? formatAreaType(value) : value}
        </td>
      ))}
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-left">
        {sunEval && (
          <>
            <Sun className="h-4 w-4 text-amber-500 inline" />
            <p className="inline text-xs font-bold">{pc_in_sun?.toFixed(2)}%</p>
          </>
        )}
      </td>
    </tr>
  );
};

export default AreaTableRow;
