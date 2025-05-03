import React from "react";

interface HalfColorDivProps {
  className?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export const HalfColorDiv: React.FC<HalfColorDivProps> = ({
  className = "",
  primaryColor = "#FFCC00",
  secondaryColor = "#e5e7eb",
}) => {
  return (
    <div
      className={`w-[20px] h-[20px] rounded-full ${className}`}
      style={{
        background: `linear-gradient(to right, ${primaryColor} 50%, ${secondaryColor} 50%)`,
      }}
    />
  );
};

export default HalfColorDiv;
