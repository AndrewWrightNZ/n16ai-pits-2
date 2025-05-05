import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { RouterProvider, createRouter } from "@tanstack/react-router";

/// Import the generated route tree
import { routeTree } from "./routeTree.gen";
import GeneralProviders from "./providers";

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Empty component to replace the default "Loading..." text
const EmptyPendingComponent = () => null;

// Render the app
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <GeneralProviders>
        <RouterProvider
          router={router}
          defaultPendingComponent={EmptyPendingComponent}
        />
      </GeneralProviders>
    </StrictMode>
  );
}
