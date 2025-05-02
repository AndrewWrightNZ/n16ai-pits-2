// Hooks
import usePubs from "../hooks/usePubs";

// Types
import { Pub } from "../../../../_shared/types";

// Components
import CustomMarker from "./customMarker";
import usePubAreas from "../../../areas/identifier/_shared/hooks/usePubAreas";

interface RenderPubsOfTypeProps {
  filterName: string;
}

const RenderPubsOfType = () => {
  //
  // Hooks
  const {
    data: { pubsWithAreasAndSunEvals },
  } = usePubAreas();

  return (
    <>
      {pubsWithAreasAndSunEvals?.map((pubWithAreas) => (
        <CustomMarker key={pubWithAreas.pub.id} pubWithAreas={pubWithAreas} />
      ))}
    </>
  );
};

export default RenderPubsOfType;
