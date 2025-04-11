// Context
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Providers
import { MapSettingsProvider } from "../maps/_shared/context/useMapSettingsContext";
import { PubProvider } from "../pages/finder/_shared/providers/PubProvider";
import { PubAreasProvider } from "../pages/area-identifier/_shared/providers/PubAreasProvider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

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
          <MapSettingsProvider>{children}</MapSettingsProvider>
          <ReactQueryDevtools />
        </PubAreasProvider>
      </PubProvider>
    </QueryClientProvider>
  );
};
export default GeneralProviders;
