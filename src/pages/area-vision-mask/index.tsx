import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

const PubAreaVisionMask = () => {
  const navigate = useNavigate();

  return (
    <div>
      <button
        onClick={() => navigate({ to: "/finder" })}
        className="flex items-center gap-2"
      >
        <ChevronLeft className="w-6 h-6" />
        back to map
      </button>
      <p>Set up Pub Area Vision Mask</p>
    </div>
  );
};

export default PubAreaVisionMask;
