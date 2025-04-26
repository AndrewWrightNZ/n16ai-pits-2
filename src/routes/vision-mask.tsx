import { createFileRoute } from "@tanstack/react-router";

// Components
import PubAreaVisionMask from "../pages/area-vision-mask";

export const Route = createFileRoute("/vision-mask")({
  component: PubAreaVisionMask,
});
