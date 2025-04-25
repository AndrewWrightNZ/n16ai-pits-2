import { createFileRoute } from "@tanstack/react-router";

// Pages
import SessionPage from "../pages/session";

export const Route = createFileRoute("/session")({
  component: SessionPage,
});
