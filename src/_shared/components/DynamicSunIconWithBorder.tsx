import DynamicSunIcon from "./dynamicSunIcon";

interface DynamicSunIconWithBorderProps {
  sunPercent: number;
}

const DynamicSunIconWithBorder = ({
  sunPercent,
}: DynamicSunIconWithBorderProps) => {
  return (
    <div
      className={`w-[50px] h-[50px] bg-white rounded-full flex items-center justify-center relative cursor-pointer ${sunPercent >= 50 && sunPercent < 75 ? "sun-icon-gradient-border" : ""}`}
      style={{
        ...(sunPercent >= 75
          ? { border: "2px solid #FFCC00" }
          : sunPercent < 50
            ? { border: "2px solid #e5e7eb" }
            : {}),
      }}
    >
      {/* Gradient border for middle tier */}
      {sunPercent >= 50 && sunPercent < 75 && (
        <div
          className="absolute inset-0 rounded-full z-[-1]"
          style={{
            background: "linear-gradient(to right, #FFCC00 50%, #e5e7eb 50%)",
            padding: "2px",
            transform: "rotate(45deg)",
            margin: "-2px",
          }}
        />
      )}
      <DynamicSunIcon sunPercent={sunPercent} className="w-[25px] h-[25px]" />
    </div>
  );
};

export default DynamicSunIconWithBorder;
