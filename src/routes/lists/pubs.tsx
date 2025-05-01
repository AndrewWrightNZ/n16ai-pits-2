import { createFileRoute } from "@tanstack/react-router";

// Components
import OneHundred from "../../pages/lists/pubs/one-hundred";

export const Route = createFileRoute("/lists/pubs")({
  component: OneHundred,
});
