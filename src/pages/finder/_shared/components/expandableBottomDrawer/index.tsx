import { useEffect, useState } from "react";
import usePubAreas from "../../../../../_shared/hooks/pubAreas/usePubAreas";

const ExpandableBottomDrawer = () => {
  // State
  const [isTransitionHeight, setIsTransitionHeight] = useState(false);

  // Hooks
  const {
    data: { selectedPub },
    operations: { onSetSelectedPub },
  } = usePubAreas();

  console.log("selectedPub", selectedPub);

  // Effects - Hide content during height transitions
  useEffect(() => {
    setIsTransitionHeight(true);
    setTimeout(() => {
      setIsTransitionHeight(false);
    }, 300);
  }, [selectedPub]);

  return (
    <div
      className={`transition-all duration-300 ease-in-out fixed bottom-[0px] left-[8px] right-[8px]  p-4 bg-white shadow-lg border-1 border-slate-800 rounded-t-xl ${selectedPub ? "h-[80vh]" : "h-16"}`}
    >
      <div
        className={`${isTransitionHeight ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
      >
        {selectedPub?.id ? (
          <div>
            <button onClick={() => onSetSelectedPub(null)}>
              {selectedPub?.id || "not selected"}
            </button>
            <button onClick={() => onSetSelectedPub(null)}>
              {selectedPub?.id || "not selected"}
            </button>
            <button onClick={() => onSetSelectedPub(null)}>
              {selectedPub?.id || "not selected"}
            </button>
            <button onClick={() => onSetSelectedPub(null)}>
              {selectedPub?.id || "not selected"}
            </button>
            <button onClick={() => onSetSelectedPub(null)}>
              {selectedPub?.id || "not selected"}
            </button>
            <button onClick={() => onSetSelectedPub(null)}>
              {selectedPub?.id || "not selected"}
            </button>
            <button onClick={() => onSetSelectedPub(null)}>
              {selectedPub?.id || "not selected"}
            </button>
          </div>
        ) : (
          <div className="h-16">
            <p>Time slider here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandableBottomDrawer;
