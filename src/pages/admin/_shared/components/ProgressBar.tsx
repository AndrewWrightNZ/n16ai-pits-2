interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  percentage?: boolean;
}

const ProgressBar = ({
  value,
  max,
  label,
  percentage = false,
}: ProgressBarProps) => {
  const percent = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-base font-medium">{label}</span>
        <span className="text-sm font-medium">
          {value} / {percentage ? `${max}%` : max} ({percent}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className={`h-4 rounded-full ${percent < 30 ? "bg-red-500" : percent < 70 ? "bg-yellow-500" : "bg-green-500"}`}
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
