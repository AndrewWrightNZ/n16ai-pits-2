import usePubAreas from "../../../../areas/identifier/_shared/hooks/usePubAreas";

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
