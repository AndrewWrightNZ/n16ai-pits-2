// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
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

export const GeneralProviders = ({ children }: any) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
      },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleMapsProvider>
        <PubProvider>
          <PubAreasProvider>
            <PubLabelsProvider>
              <GeoLocationProvider>
                <SunEvalsProvider>
                  <FiltersProvider>
                    <MapSettingsProvider>{children}</MapSettingsProvider>
                  </FiltersProvider>
                </SunEvalsProvider>
              </GeoLocationProvider>
              {/* <ReactQueryDevtools /> */}
            </PubLabelsProvider>
          </PubAreasProvider>
        </PubProvider>
      </GoogleMapsProvider>
    </QueryClientProvider>
  );
};
export default GeneralProviders;
