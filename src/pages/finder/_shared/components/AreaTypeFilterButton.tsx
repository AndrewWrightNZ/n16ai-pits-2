import { ReactNode } from "react";

export type AreaTypeFilterButtonProps = {
  id: string;
  label: string;
  count: number;
  isSelected: boolean;
  onClick: (id: string) => void;
  icon: ReactNode;
};

export const AreaTypeFilterButton = ({
  id,
  label,
  count,
  isSelected,
  onClick,
  icon,
}: AreaTypeFilterButtonProps) => {
  return (
    <button
      disabled={count === 0}
      className={`flex cursor-pointer transition-all duration-300 ease-in-out flex-row items-center justify-end bg-white rounded-[30px] border-2 p-3 gap-2 ${isSelected && count > 0 ? "border-slate-800 opacity-100 text-slate-800" : "border-slate-400 text-slate-400 opacity-80 hover:opacity-100 hover:text-slate-800"}`}
      onClick={() => onClick(id)}
    >
      <div className="transition-transform duration-300 ease-in-out">
        {icon}
      </div>
      <p
        className={`font-bold text-xs transition-opacity duration-300 ease-in-out`}
      >
        {label}s ({count})
      </p>
    </button>
  );
};
