import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Providers
import { PubProvider } from "../pages/finder/_shared/providers/PubProvider";
import { GeoLocationProvider } from "../_shared/providers/useGeolocationContext";
import { MapSettingsProvider } from "../maps/_shared/context/useMapSettingsContext";
import { PubLabelsProvider } from "../pages/pub-labels/_shared/providers/PubLabelsProvider";
import { PubAreasProvider } from "../pages/area-identifier/_shared/providers/PubAreasProvider";

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
      <PubProvider>
        <PubAreasProvider>
          <PubLabelsProvider>
            <GeoLocationProvider>
              <MapSettingsProvider>{children}</MapSettingsProvider>
            </GeoLocationProvider>
            <ReactQueryDevtools />
          </PubLabelsProvider>
        </PubAreasProvider>
      </PubProvider>
    </QueryClientProvider>
  );
};
export default GeneralProviders;
