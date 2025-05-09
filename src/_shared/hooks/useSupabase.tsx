import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import useAuth from "../hooks/auth/useAuth";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase credentials are not available");
}

// Create the anonymous client for public access
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Create a context for storing the auth client globally
let globalAuthClient: SupabaseClient | null = null;
let globalAuthToken: string | null = null;

/**
 * Hook to get a Supabase client with Auth0 JWT token for authenticated requests
 * This ensures only admin users can make changes to the database when RLS is configured
 */
export const useSupabaseAuth = () => {
  const [authClient, setAuthClient] = useState<SupabaseClient | null>(
    globalAuthClient
  );
  const { data, operations } = useAuth();
  const { isAuthenticated, isAdmin } = data;
  const { getToken } = operations;

  /**
   * Gets or creates an authenticated Supabase client
   */
  const getAuthClient = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const token = await getToken();

        // If token hasn't changed and we already have a client, reuse it
        if (token === globalAuthToken && globalAuthClient) {
          setAuthClient(globalAuthClient);
          return globalAuthClient;
        }

        // Create a new client with the token
        globalAuthToken = token;
        globalAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        setAuthClient(globalAuthClient);
        return globalAuthClient;
      } catch (error) {
        console.error("Error creating authenticated Supabase client:", error);
        // Fall back to anonymous client
        setAuthClient(supabaseClient);
        return supabaseClient;
      }
    } else {
      // Use anonymous client when not authenticated
      globalAuthToken = null;
      globalAuthClient = null;
      setAuthClient(supabaseClient);
      return supabaseClient;
    }
  }, [isAuthenticated, getToken]);

  // Initialize or update the client when auth state changes
  useEffect(() => {
    getAuthClient();
  }, [isAuthenticated, getAuthClient]);

  return {
    client: authClient || supabaseClient,
    isAdmin,
    isAuthenticated,
    refreshClient: getAuthClient,
  };
};
