// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Auth0Provider } from "@auth0/auth0-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Providers
import { GoogleMapsProvider } from "./GoogleMapsProvider";
import { PubProvider } from "../_shared/providers/PubProvider";
import { SunEvalsProvider } from "../_shared/providers/useSunEvals";
import { FiltersProvider } from "../_shared/providers/FiltersProvider";
import { PubAreasProvider } from "../_shared/providers/PubAreasProvider";
import { GeoLocationProvider } from "../_shared/providers/useGeolocationContext";
import { MapSettingsProvider } from "../pages/scene/_shared/context/useMapSettingsContext";
import { PubLabelsProvider } from "../pages/pub-labels/_shared/providers/PubLabelsProvider";
import { EarlyAccessProvider } from "../_shared/providers/EarlyAccessProvider";

export const GeneralProviders = ({ children }: any) => {
  // Variables
  const AUTH_0_DOMAIN = "pubs-in-the-sun.uk.auth0.com";
  const AUTH_0_CLIENT_ID = "SdRToWH6TgoSYWmujdlxNUS0PrUftc53";

  // Check if window is defined (client-side) or not (server-side)
  const redirectUri =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:5173";

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
      },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <Auth0Provider
        domain={AUTH_0_DOMAIN}
        clientId={AUTH_0_CLIENT_ID}
        authorizationParams={{
          redirect_uri: redirectUri,
          audience: `https://${AUTH_0_DOMAIN}/userinfo`,
          scope: "openid profile email",
        }}
      >
        <GoogleMapsProvider>
          <PubProvider>
            <PubAreasProvider>
              <PubLabelsProvider>
                <GeoLocationProvider>
                  <SunEvalsProvider>
                    <FiltersProvider>
                      <EarlyAccessProvider>
                        <MapSettingsProvider>{children}</MapSettingsProvider>
                      </EarlyAccessProvider>
                    </FiltersProvider>
                  </SunEvalsProvider>
                </GeoLocationProvider>
                {/* <ReactQueryDevtools /> */}
              </PubLabelsProvider>
            </PubAreasProvider>
          </PubProvider>
        </GoogleMapsProvider>
      </Auth0Provider>
    </QueryClientProvider>
  );
};
export default GeneralProviders;
