import { createFileRoute } from "@tanstack/react-router";

// Components
import Home from "../pages/home";

export const Route = createFileRoute("/")({
  component: Home,
});
