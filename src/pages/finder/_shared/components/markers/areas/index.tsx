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

// Reusable component for displaying sun indicator
const SunIndicator = ({ pcInSun }: { pcInSun: number }) => {
  const sunCircleClass = fn.getSunCircleClassFromPercentage(pcInSun);
  const isSunHalfMarker = sunCircleClass === "sun-half-marker";

  return (
    <div
      className={`h-[15px] w-[15px] ml-[2px] rounded-full ${sunCircleClass}`}
      style={{
        ...(isSunHalfMarker && {
          background: "linear-gradient(to right, #FFCC00 50%, #e5e7eb 50%)",
          transform: "rotate(45deg)",
        }),
      }}
      aria-label={`Sun indicator: ${pcInSun.toFixed(0)}%`}
    />
  );
};

// Reusable component for displaying area information
const AreaInfo = ({ area }: { area: SimplePubAreaWithSunPc }) => {
  return (
    <div className="flex flex-row justify-start items-center gap-2">
      <SunIndicator pcInSun={area.pc_in_sun} />

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
  );
};

// Component to display a list of areas with a title
const AreaList = ({
  title,
  areas,
  className = "",
}: {
  title: string;
  areas: SimplePubAreaWithSunPc[];
  className?: string;
}) => {
  if (areas.length === 0) return null;

  return (
    <>
      <p className={className}>{title}</p>
      {areas.map((area, index) => (
        <AreaInfo key={index} area={area} />
      ))}
    </>
  );
};

const ShowPubAreas = ({ pubAreas }: ShowPubAreasProps) => {
  // Hooks
  const {
    data: { selectedAreaTypes = [] },
  } = usePubAreas();

  // Variables
  const filteredSunEvals = pubAreas.filter((area) =>
    selectedAreaTypes.includes(area.type)
  );

  const filteredOutSunEvals = pubAreas.filter(
    (area) => !selectedAreaTypes.includes(area.type)
  );

  const moreThanOneArea = filteredSunEvals.length > 1;

  let bestArea: SimplePubAreaWithSunPc | null = null;
  let otherAreas: SimplePubAreaWithSunPc[] = [];

  if (moreThanOneArea) {
    bestArea = pubAreas.reduce((prev, current) => {
      return prev.pc_in_sun > current.pc_in_sun ? prev : current;
    });
    otherAreas = pubAreas.filter((area) => area !== bestArea);
  }

  return (
    <div className="flex flex-col items-start gap-2 mt-6">
      {moreThanOneArea && bestArea ? (
        <>
          <p className="font-bold">Sunniest area:</p>
          <div
            className="flex flex-row justify-start items-center gap-2"
            style={{ fontFamily: "Poppins, sans-serif !important" }}
          >
            <AreaInfo area={bestArea} />
          </div>

          <AreaList title="Other areas:" areas={otherAreas} className="mt-2" />
        </>
      ) : (
        <>
          <AreaList title="Type of area:" areas={filteredSunEvals} />
          <AreaList
            title="Other areas:"
            areas={filteredOutSunEvals}
            className={filteredSunEvals?.length > 0 ? "mt-2" : ""}
          />
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
