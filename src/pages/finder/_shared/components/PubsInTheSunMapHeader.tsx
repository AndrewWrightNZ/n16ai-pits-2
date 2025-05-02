// IMages
import sunLogo from "../../../../assets/bigBoldSun.svg";

const PubInTheSunMapHeader = () => {
  return (
    <div className="fixed flex flex-row items-center gap-4 top-2 left-2 rounded-[30px] bg-[#2962FF] p-4">
      <img
        src={sunLogo}
        className="w-7 h-7 [animation:slow-spin_20s_linear_infinite]"
        alt="Sun"
      />
      <h1 className="font-black text-white text-xl">Pubs In The Sun</h1>
    </div>
  );
};

export default PubInTheSunMapHeader;
