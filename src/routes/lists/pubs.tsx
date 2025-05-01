import { createFileRoute } from "@tanstack/react-router";

// Components
import PitsOneHundredPubsList from "../../pages/lists/pubs/pubList";

export const Route = createFileRoute("/lists/pubs")({
  component: PitsOneHundredPubsList,
});
