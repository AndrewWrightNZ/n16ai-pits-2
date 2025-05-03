// Utils
import * as fn from "../../../../../../_shared/utils";
import { formatAreaType } from "../../../../../lists/_shared";

// Assets
import sunLogo from "../../../../../../assets/biggerBolderSun.svg";
import usePubAreas from "../../../../../../_shared/hooks/pubAreas/usePubAreas";

// Types
import { SimplePubAreaWithSunPc } from "../../../../../../_shared/hooks/mapMarkers/useMapMarkers";

interface ShowPubAreasProps {
  pubAreas: SimplePubAreaWithSunPc[];
}

const ShowPubAreas = ({ pubAreas }: ShowPubAreasProps) => {
  //

  // Hooks
  const {
    data: { selectedAreaTypes = [] },
  } = usePubAreas();
  //

  // Variables
  const filteredSunEvals = pubAreas.filter((area) =>
    selectedAreaTypes.includes(area.type)
  );

  const filteredOutSunEvals = pubAreas.filter(
    (area) => !selectedAreaTypes.includes(area.type)
  );

  const moreThanOneArea = filteredSunEvals.length > 1;

  let bestArea = null;

  if (moreThanOneArea) {
    bestArea = pubAreas.reduce((prev, current) => {
      return prev.pc_in_sun > current.pc_in_sun ? prev : current;
    });
  }

  const otherAreas = pubAreas.filter((area) => area !== bestArea);

  return (
    <div className="flex flex-col items-start gap-2 mt-6">
      {moreThanOneArea && bestArea ? (
        <>
          <p className="font-bold">Sunniest area:</p>
          <div
            className="flex flex-row justify-start items-center gap-2"
            style={{ fontFamily: "Poppins, sans-serif !important" }}
          >
            <div
              className={`h-[15px] w-[15px] ml-[2px] rounded-full ${fn.getSunCircleClassFromPercentage(bestArea?.pc_in_sun || 0)}`}
              style={{
                ...(fn.getSunCircleClassFromPercentage(
                  bestArea?.pc_in_sun || 0
                ) === "sun-half-marker" && {
                  background:
                    "linear-gradient(to right, #FFCC00 50%, #e5e7eb 50%)",
                  transform: "rotate(45deg)",
                }),
              }}
              aria-label={`Sun indicator: ${bestArea?.pc_in_sun.toFixed(0)}%`}
            />

            <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap w-12">
              {bestArea.pc_in_sun.toFixed(0)}%
              <span className="font-normal ml-1">sun</span>
            </p>

            <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
              {formatAreaType(bestArea.type)}
            </p>
            <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
              {bestArea.floor_area.toFixed(0)}m<sup>2</sup>
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
                style={{
                  ...(fn.getSunCircleClassFromPercentage(area.pc_in_sun) ===
                    "sun-half-marker" && {
                    background:
                      "linear-gradient(to right, #FFCC00 50%, #e5e7eb 50%)",
                    transform: "rotate(45deg)",
                  }),
                }}
                aria-label={`Sun indicator: ${area.pc_in_sun.toFixed(0)}%`}
              />

              <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap w-12">
                {area.pc_in_sun.toFixed(0)}%
                <span className="font-normal ml-1">sun</span>
              </p>

              <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
                {formatAreaType(area.type)}
              </p>
              <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
                {area.floor_area.toFixed(0)}m<sup>2</sup>
              </p>
            </div>
          ))}
        </>
      ) : (
        <>
          {filteredSunEvals?.length > 0 && <p className="">Type of area:</p>}
          {filteredSunEvals.map((sunValue, index) => (
            <div
              key={index}
              className="flex flex-row justify-start items-center gap-2"
            >
              <div
                className={`h-[15px] w-[15px] ml-[2px] rounded-full ${fn.getSunCircleClassFromPercentage(sunValue.pc_in_sun)}`}
                style={{
                  ...(fn.getSunCircleClassFromPercentage(sunValue.pc_in_sun) ===
                    "sun-half-marker" && {
                    background:
                      "linear-gradient(to right, #FFCC00 50%, #e5e7eb 50%)",
                    transform: "rotate(45deg)",
                  }),
                }}
                aria-label={`Sun indicator: ${sunValue.pc_in_sun.toFixed(0)}%`}
              />

              <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap w-12">
                {sunValue.pc_in_sun.toFixed(0)}%
                <span className="font-normal ml-1">sun</span>
              </p>

              <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
                {formatAreaType(sunValue.type)}
              </p>
              <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
                {sunValue.floor_area.toFixed(0)}m<sup>2</sup>
              </p>
            </div>
          ))}

          <>
            {filteredOutSunEvals.length > 0 && (
              <p className={filteredSunEvals?.length > 0 ? "mt-2" : ""}>
                Other areas:
              </p>
            )}
            {filteredOutSunEvals.map((sunValue, index) => (
              <div
                key={index}
                className="flex flex-row justify-start items-center gap-2"
              >
                <div
                  className={`h-[15px] w-[15px] ml-[2px] rounded-full ${fn.getSunCircleClassFromPercentage(sunValue.pc_in_sun)}`}
                  style={{
                    ...(fn.getSunCircleClassFromPercentage(
                      sunValue.pc_in_sun
                    ) === "sun-half-marker" && {
                      background:
                        "linear-gradient(to right, #FFCC00 50%, #e5e7eb 50%)",
                      transform: "rotate(45deg)",
                    }),
                  }}
                  aria-label={`Sun indicator: ${sunValue.pc_in_sun.toFixed(0)}%`}
                />

                <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap w-12">
                  {sunValue.pc_in_sun.toFixed(0)}%
                  <span className="font-normal ml-1">sun</span>
                </p>

                <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
                  {formatAreaType(sunValue.type)}
                </p>

                <p className="text-xs font-medium text-black-800 mx-1 flex items-center whitespace-nowrap">
                  {sunValue.floor_area.toFixed(0)}m<sup>2</sup>
                </p>
              </div>
            ))}
          </>
        </>
      )}

      <button
        className="mt-2 w-full font-bold rounded-xl flex flex-row justify-center items-center gap-2 border border-2 p-2 border-[#2962FF] bg-[#2962FF] text-white opacity-100 hover:opacity-80 transition-opacity duration-300"
        style={{ fontFamily: "Poppins, sans-serif !important" }}
      >
        <div
          className="w-[15px] h-[15px]"
          style={{
            maskImage: `url(${sunLogo})`,
            WebkitMaskImage: `url(${sunLogo})`,
            maskSize: "contain",
            WebkitMaskSize: "contain",
            backgroundColor: "white",
          }}
          aria-label="Sun"
        />
        View Live Sun
      </button>
    </div>
  );
};

export default ShowPubAreas;
