// Hooks

// Types

// Components
import { Pub } from "../../../../_shared/types";
import usePubs from "../hooks/usePubs";
import CustomMarker from "./customMarker";

interface RenderPubsOfTypeProps {
  filterName: string;
}

const RenderPubsOfType = ({ filterName }: RenderPubsOfTypeProps) => {
  //
  // Hooks
  const {
    data: {
      pubsInTheSun = [],
      pubsPartiallyInTheSun = [],
      pubsNotInTheSun = [],
    },
  } = usePubs();

  //
  // Variables
  let pubsToRender: Pub[] = [];

  switch (filterName) {
    case "full_sun":
      pubsToRender = pubsInTheSun;
      break;
    case "partial_sun":
      pubsToRender = pubsPartiallyInTheSun;
      break;
    case "no_sun":
      pubsToRender = pubsNotInTheSun;
      break;
    default:
      pubsToRender = [];
  }

  console.log("RenderPubsOfType - pubsToRender:", pubsToRender);

  return (
    <>
      {pubsToRender?.map((pub) => (
        <CustomMarker key={pub.id} pubDetails={pub} filterName={filterName} />
      ))}
    </>
  );
};

export default RenderPubsOfType;
