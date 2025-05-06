import { createFileRoute } from "@tanstack/react-router";

// Component
import AreaSizer from "../../pages/areas/sizer";

export const Route = createFileRoute("/areas/sizer")({
  component: AreaSizer,
});
