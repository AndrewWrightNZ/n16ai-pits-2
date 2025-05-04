// Types
import { Sun } from "lucide-react";
import useSunEvals from "../../../../../_shared/hooks/sunEvals/useSunEvals";
import { PubForTableDisplay } from "../../pubList";
import {
  formatAreaSize,
  formatAreaTypes,
  formatShortAddress,
} from "../helpers";
import usePubAreas from "../../../../../_shared/hooks/pubAreas/usePubAreas";

interface ExpandablePubRowProps {
  pub: PubForTableDisplay;
  index: number;
}

const ExpandablePubRow = ({ pub, index }: ExpandablePubRowProps) => {
  //

  // Hooks
  const {
    data: { sunEvalsForTimeslot = [] },
  } = useSunEvals();

  const {
    operations: { onSetSelectedPub },
  } = usePubAreas();

  // Get sunPC for pub
  const sunEvalsForPub = sunEvalsForTimeslot.filter(
    ({ pub_id }) => pub_id === pub.id
  );

  return (
    <tr key={pub.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {index + 1}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
        {pub.name}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
        {formatShortAddress(pub.address_text)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {pub.postcode}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
        {formatAreaSize(pub.totalArea)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatAreaTypes(pub.areaTypes)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex flex-row items-center">
          {sunEvalsForPub.map((sunEval) => (
            <Sun key={sunEval.id} className="h-4 w-4 mr-1 text-amber-500" />
          ))}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        <button
          onClick={() => onSetSelectedPub(pub)}
          className="text-blue-600 hover:text-blue-800"
        >
          View Details
        </button>
      </td>
    </tr>
  );
};

export default ExpandablePubRow;
