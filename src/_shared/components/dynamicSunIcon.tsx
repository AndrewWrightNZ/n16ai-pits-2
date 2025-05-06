// Assets
import sunLogo from "../../assets/biggerBolderSun.svg";

interface DynamicSunIconProps {
  sunPercent: number;
  className?: string;
}

const DynamicSunIcon = ({ sunPercent, className }: DynamicSunIconProps) => {
  return (
    <div
      className={`${className || "w-[30px] h-[30px]"}`}
      style={{
        maskImage: `url(${sunLogo})`,
        WebkitMaskImage: `url(${sunLogo})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        ...(sunPercent >= 75
          ? { backgroundColor: "#ffc400" }
          : sunPercent >= 50
            ? {
                background:
                  "linear-gradient(to right, #ffc400 50%, #b7b7b7 50%)",
                transform: "rotate(45deg)",
              }
            : { backgroundColor: "#b7b7b7" }),
      }}
      aria-label="Sun"
    />
  );
};

export default DynamicSunIcon;
