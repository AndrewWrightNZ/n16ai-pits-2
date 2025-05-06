import { createFileRoute } from "@tanstack/react-router";

// Components
import PubAreaSimulator from "../../pages/areas/simulator";

export const Route = createFileRoute("/areas/simulator")({
  component: PubAreaSimulator,
});
