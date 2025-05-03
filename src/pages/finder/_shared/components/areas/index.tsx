import { PubArea, SunEval } from "../../../../../_shared/types";
import { formatAreaType } from "../../../../lists/_shared";

// Utils
import * as fn from "../../../../../_shared/utils";
import { Sun } from "lucide-react";

interface ShowPubAreasProps {
  sunEvals: (SunEval & { pubArea: PubArea })[];
}
const ShowPubAreas = ({ sunEvals }: ShowPubAreasProps) => {
  //

  // Variables
  const moreThanOneArea = sunEvals.length > 1;

  let bestArea = null;

  if (moreThanOneArea) {
    bestArea = sunEvals.reduce((prev, current) => {
      return prev.pc_in_sun > current.pc_in_sun ? prev : current;
    });
  }

  const otherAreas = sunEvals.filter((area) => area !== bestArea);

  return (
    <div className="flex flex-col items-start gap-2 mt-6">
      {moreThanOneArea && bestArea ? (
        <>
          <p>Best area:</p>
          <div className="flex flex-row justify-start items-center gap-2">
            <div
              className={`h-[15px] w-[15px] ml-[2px] rounded-full ${fn.getSunCircleClassFromPercentage(bestArea?.pc_in_sun || 0)}`}
              aria-label={`Sun indicator: ${bestArea?.pc_in_sun.toFixed(0)}%`}
            />

            <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap w-16">
              {bestArea.pc_in_sun.toFixed(0)}%
              <span className="font-normal ml-1">in sun</span>
            </p>

            <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
              {formatAreaType(bestArea.pubArea.type)}
            </p>
          </div>

          <p className="mt-2">Other areas:</p>
          {otherAreas.map((area, index) => (
            <div
              key={index}
              className="flex flex-row justify-start items-center gap-2"
            >
              <div
                className={`h-[15px] w-[15px] ml-[2px] rounded-full ${fn.getSunCircleClassFromPercentage(area.pc_in_sun)}`}
                aria-label={`Sun indicator: ${area.pc_in_sun.toFixed(0)}%`}
              />

              <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap w-16">
                {area.pc_in_sun.toFixed(0)}%
                <span className="font-normal ml-1">in sun</span>
              </p>

              <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
                {formatAreaType(area.pubArea.type)}
              </p>
            </div>
          ))}
        </>
      ) : (
        <>
          <p className="">Areas:</p>
          {sunEvals.map((sunValue, index) => (
            <div
              key={index}
              className="flex flex-row justify-start items-center gap-2"
            >
              <div
                className={`h-[15px] w-[15px] ml-[2px] rounded-full ${fn.getSunCircleClassFromPercentage(sunValue.pc_in_sun)}`}
                aria-label={`Sun indicator: ${sunValue.pc_in_sun.toFixed(0)}%`}
              />

              <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap w-16">
                {sunValue.pc_in_sun.toFixed(0)}%
                <span className="font-normal ml-1">in sun</span>
              </p>

              <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
                {formatAreaType(sunValue.pubArea.type)}
              </p>
            </div>
          ))}
        </>
      )}

      <button className="mt-2 w-full rounded-xl flex flex-row justify-center items-center gap-2 border border-2 p-2 border-[#2962FF] bg-[#2962FF] text-white">
        <Sun className="w-4 h-4" />
        View Live Sun
      </button>
    </div>
  );
};

export default ShowPubAreas;
