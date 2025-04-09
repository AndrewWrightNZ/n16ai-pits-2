// Context
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Providers
import { MapSettingsProvider } from "../maps/_shared/context/useMapSettingsContext";
import { PubProvider } from "../pages/finder/_shared/providers/PubProvider";

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
        <MapSettingsProvider>{children}</MapSettingsProvider>
      </PubProvider>
    </QueryClientProvider>
  );
};
export default GeneralProviders;
