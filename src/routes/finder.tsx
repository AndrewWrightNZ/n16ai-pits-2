import { createFileRoute } from "@tanstack/react-router";

// Components
import Finder from "../pages/finder";

export const Route = createFileRoute("/finder")({
  component: Finder,
});
