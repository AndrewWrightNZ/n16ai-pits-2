// Assets
import sunLogo from "../../assets/biggerBolderSun.svg";

interface DynamicSunIconProps {
  sunPercent: number;
  className?: string;
}

const DynamicSunIcon = ({ sunPercent, className }: DynamicSunIconProps) => {
  return (
    <div
      className={`w-[30px] h-[30px] ${className}`}
      style={{
        maskImage: `url(${sunLogo})`,
        WebkitMaskImage: `url(${sunLogo})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        ...(sunPercent >= 75
          ? { backgroundColor: "#FFCC00" }
          : sunPercent >= 50
            ? {
                background:
                  "linear-gradient(to right, #FFCC00 50%, #e5e7eb 50%)",
                transform: "rotate(45deg)",
              }
            : { backgroundColor: "#e5e7eb" }),
      }}
      aria-label="Sun"
    />
  );
};

export default DynamicSunIcon;
