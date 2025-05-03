// Components
import { FilterButton } from "./FilterButton";

// Hooks
import useSunEvals from "../../../../../_shared/hooks/sunEvals/useSunEvals";

const PubCounts = () => {
  //

  // Hooks
  const {
    data: { sunQualitySelected = [] },
    operations: { onSunQualityFilterClick },
  } = useSunEvals();

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
          isSelected={sunQualitySelected.includes(filter.id)}
          onClick={onSunQualityFilterClick}
          icon={filter.icon}
        />
      ))}
    </div>
  );
};

export default PubCounts;
