// IMages
import sunLogo from "../../../../assets/biggerBolderSun.svg";

const PubInTheSunMapHeader = () => {
  return (
    <div className="fixed flex flex-row items-center gap-4 top-2 left-2 rounded-[30px] bg-[#2962FF] p-4">
      <div
        className="w-[30px] h-[30px]"
        style={{
          maskImage: `url(${sunLogo})`,
          WebkitMaskImage: `url(${sunLogo})`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          backgroundColor: "#FFCC00",
        }}
        aria-label="Sun"
      />
      <h1 className="font-black text-white text-xl">Pubs In The Sun</h1>
    </div>
  );
};

export default PubInTheSunMapHeader;
