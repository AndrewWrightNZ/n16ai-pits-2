import usePubAreas from "../../../../../_shared/hooks/pubAreas/usePubAreas";

const SelectedPubView = () => {
  //

  // Hooks
  const {
    data: { selectedPub },
  } = usePubAreas();

  return (
    <>
      <p>Sleected pub: {selectedPub?.name}</p>
    </>
  );
};

export default SelectedPubView;
