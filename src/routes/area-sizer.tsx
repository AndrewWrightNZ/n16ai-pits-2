import { createFileRoute } from "@tanstack/react-router";

// Component
import AreaSizer from "../pages/area-sizer";

export const Route = createFileRoute("/area-sizer")({
  component: AreaSizer,
});
