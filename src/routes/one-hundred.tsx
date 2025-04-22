import { createFileRoute } from "@tanstack/react-router";
import OneHundred from "../pages/lists/pubs/one-hundred";

export const Route = createFileRoute("/one-hundred")({
  component: OneHundred,
});
