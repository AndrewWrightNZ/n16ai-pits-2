// lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

// Use a singleton pattern with proper typing
let queryClientInstance: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
        },
      },
    });
  }
  return queryClientInstance;
}

// Export the initialized client for React components
export const queryClient = getQueryClient();
