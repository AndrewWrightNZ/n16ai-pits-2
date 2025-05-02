import { createFileRoute } from "@tanstack/react-router";

// Components
import AreasList from "../../pages/lists/areas";

export const Route = createFileRoute("/lists/areas")({
  component: AreasList,
});
