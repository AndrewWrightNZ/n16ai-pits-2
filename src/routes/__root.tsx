import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="p-2 flex gap-2">
        <Link to="/" className="[&.active]:font-bold">
          Home
        </Link>{" "}
        <Link to="/finder" className="[&.active]:font-bold">
          Finder
        </Link>
        <Link to="/scene" className="[&.active]:font-bold">
          3D Scene
        </Link>
        <Link to="/area-identifier" className="[&.active]:font-bold">
          Area identifier
        </Link>
        <Link to="/area-sizer" className="[&.active]:font-bold">
          Area sizer
        </Link>
      </div>
      <hr />
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
});
