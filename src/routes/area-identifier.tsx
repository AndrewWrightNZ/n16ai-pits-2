import { createFileRoute } from "@tanstack/react-router";

// Components
import AreaIdentifier from "../pages/area-identifier";

export const Route = createFileRoute("/area-identifier")({
  component: AreaIdentifier,
});
