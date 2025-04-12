import { createFileRoute } from "@tanstack/react-router";
import AdminOverview from "../pages/admin";

export const Route = createFileRoute("/admin")({
  component: AdminOverview,
});
