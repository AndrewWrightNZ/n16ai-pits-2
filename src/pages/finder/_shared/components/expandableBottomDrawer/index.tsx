import usePubAreas from "../../../../../_shared/hooks/pubAreas/usePubAreas";

const ExpandableBottomDrawer = () => {
  //

  // Hooks

  const {
    data: { selectedPub },
    operations: { onSetSelectedPub },
  } = usePubAreas();

  console.log("selectedPub", selectedPub);
  return (
    <div
      className={`transition-all duration-300 ease-in-out fixed bottom-[0px] left-[8px] right-[8px]  p-4 bg-white shadow-lg border-1 border-slate-800 rounded-t-xl ${selectedPub ? "h-[80vh]" : "h-16"}`}
    >
      <button onClick={() => onSetSelectedPub(null)}>
        {selectedPub?.id || "not selected"}
      </button>
    </div>
  );
};

export default ExpandableBottomDrawer;
