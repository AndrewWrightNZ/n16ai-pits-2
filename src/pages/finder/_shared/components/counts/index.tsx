import { useState, ReactNode } from "react";

type FilterButtonProps = {
  id: string;
  label: string;
  count: number;
  isSelected: boolean;
  onClick: (id: string) => void;
  icon: ReactNode;
};

const FilterButton = ({
  id,
  label,
  count,
  isSelected,
  onClick,
  icon,
}: FilterButtonProps) => {
  return (
    <button
      className={`flex cursor-pointer transition-all duration-200 flex-row items-center justify-end bg-white rounded-[30px] border-2 p-3 gap-2 ${isSelected ? "border-slate-800 opacity-100 text-slate-800" : "border-slate-400 text-slate-400 opacity-80 hover:opacity-100 hover:text-slate-800"}`}
      onClick={() => onClick(id)}
    >
      {icon}
      <p className={`font-bold text-xs`}>
        {label} ({count})
      </p>
    </button>
  );
};

const PubCounts = () => {
  // State
  const [filtersSelected, setFiltersSelected] = useState<string[]>([]);

  // Handlers
  const handleFilterClick = (filter: string) => {
    setFiltersSelected((prev) => {
      if (prev.includes(filter)) {
        return prev.filter((f) => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
  };

  // Filter definitions
  const filters = [
    {
      id: "good",
      label: "Good Sun",
      count: 10,
      icon: <div className="w-[20px] h-[20px] bg-[#FFCC00] rounded-full" />,
    },
    {
      id: "some",
      label: "Some Sun",
      count: 10,
      icon: (
        <div
          className="w-[20px] h-[20px] rounded-full"
          style={{
            background: "linear-gradient(to right, #FFCC00 50%, #99a1af 50%)",
            transform: "rotate(45deg)",
          }}
        />
      ),
    },
    {
      id: "no",
      label: "No Sun",
      count: 10,
      icon: <div className="w-[20px] h-[20px] bg-[#99a1af] rounded-full" />,
    },
  ];

  return (
    <div className="flex flex-row items-center justify-end fixed top-[20px] right-[8px] w-1/2 bg-none gap-4">
      {filters.map((filter) => (
        <FilterButton
          key={filter.id}
          id={filter.id}
          label={filter.label}
          count={filter.count}
          isSelected={filtersSelected.includes(filter.id)}
          onClick={handleFilterClick}
          icon={filter.icon}
        />
      ))}
    </div>
  );
};

export default PubCounts;
