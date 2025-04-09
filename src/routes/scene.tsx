import { createFileRoute } from "@tanstack/react-router";

// Components
import Scene from "../pages/scene";

export const Route = createFileRoute("/scene")({
  component: Scene,
});
