import { createFileRoute } from "@tanstack/react-router";

// Compnents
import AdminOverview from "../pages/admin";

export const Route = createFileRoute("/admin")({
  component: AdminOverview,
});
