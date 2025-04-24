// Hooks
import usePubs from "../hooks/usePubs";

// Types
import { Pub } from "../../../../_shared/types";

// Components
import CustomMarker from "./customMarker";

interface RenderPubsOfTypeProps {
  filterName: string;
}

const RenderPubsOfType = ({ filterName }: RenderPubsOfTypeProps) => {
  //
  // Hooks
  const {
    data: {
      uiReadyPubs = [],
      // pubsInTheSun = [],
      // pubsPartiallyInTheSun = [],
      // pubsNotInTheSun = [],
    },
  } = usePubs();

  //
  // Variables
  let pubsToRender: Pub[] = [];

  switch (filterName) {
    case "full_sun":
      pubsToRender = uiReadyPubs;
      break;
    case "partial_sun":
      pubsToRender = [];
      break;
    case "no_sun":
      pubsToRender = [];
      break;
    default:
      pubsToRender = [];
  }

  return (
    <>
      {pubsToRender?.map((pub) => (
        <CustomMarker key={pub.id} pubDetails={pub} filterName={filterName} />
      ))}
    </>
  );
};

export default RenderPubsOfType;
