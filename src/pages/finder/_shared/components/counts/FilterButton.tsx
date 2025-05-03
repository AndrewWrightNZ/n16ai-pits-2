import { ReactNode } from "react";

export type FilterButtonProps = {
  id: string;
  label: string;
  count: number;
  isSelected: boolean;
  onClick: (id: string) => void;
  icon: ReactNode;
};

export const FilterButton = ({
  id,
  label,
  count,
  isSelected,
  onClick,
  icon,
}: FilterButtonProps) => {
  return (
    <button
      className={`flex cursor-pointer transition-all duration-300 ease-in-out flex-row items-center justify-end bg-white rounded-[30px] border-2 p-3 gap-2 ${isSelected ? "border-slate-800 opacity-100 text-slate-800" : "border-slate-400 text-slate-400 opacity-80 hover:opacity-100 hover:text-slate-800"}`}
      onClick={() => onClick(id)}
    >
      <div className="transition-transform duration-300 ease-in-out">
        {icon}
      </div>
      <p
        className={`font-bold text-xs transition-opacity duration-300 ease-in-out`}
      >
        {label} ({count})
      </p>
    </button>
  );
};
