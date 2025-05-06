import { createFileRoute } from "@tanstack/react-router";

// Components
import SubmitAPub from "../pages/submit-a-pub";

export const Route = createFileRoute("/submit-a-pub")({
  component: SubmitAPub,
});
