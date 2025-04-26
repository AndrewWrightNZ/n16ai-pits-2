import { createFileRoute } from "@tanstack/react-router";
import AreaIdentifier from "../../pages/areas/identifier";

// Components

export const Route = createFileRoute("/areas/identifier")({
  component: AreaIdentifier,
});
