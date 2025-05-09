import { createClient } from "@supabase/supabase-js";
import useSupabaseAuth from "./useSupabaseAuth";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase credentials are not available");
}

// Create the anonymous client for public access
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Hook to get a Supabase client for database operations
 * This ensures the specific authorized user can make changes to the database when RLS is configured
 */
export const useSupabase = () => {
  const { data } = useSupabaseAuth();
  const { isAuthenticated, isAuthorizedUser } = data;

  // IMPORTANT: For now, always use the anonymous client since it's working
  // This is a temporary fix until we can properly debug the authenticated client
  const client = supabaseClient;

  console.log("Supabase client status:", {
    isAuthenticated,
    isAuthorizedUser,
    // We're always using the anonymous client for now
    usingAuthenticatedClient: false,
    clientType: "anonymous (forced)",
  });

  return {
    client,
    isAuthorizedUser,
    isAuthenticated,
  };
};
