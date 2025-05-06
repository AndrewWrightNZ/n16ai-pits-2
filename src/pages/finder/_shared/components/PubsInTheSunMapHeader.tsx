// IMages
import sunLogo from "../../../../assets/biggerBolderSun.svg";

const PubInTheSunMapHeader = () => {
  return (
    <div className="fixed flex flex-row items-center gap-2 top-2 left-2 rounded-[30px] bg-[#2962FF] p-4 border-white border-2">
      <div
        className="w-[24px] h-[24px]"
        style={{
          maskImage: `url(${sunLogo})`,
          WebkitMaskImage: `url(${sunLogo})`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          backgroundColor: "#FFCC00",
        }}
        aria-label="Sun"
      />
      <h1 className="font-black text-white text-sm mr-1">Pubs In The Sun</h1>
    </div>
  );
};

export default PubInTheSunMapHeader;
