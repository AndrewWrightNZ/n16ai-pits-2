import { createFileRoute } from "@tanstack/react-router";

// Components
import PubLabels from "../pages/pub-labels";

export const Route = createFileRoute("/pub-labels")({
  component: PubLabels,
});
