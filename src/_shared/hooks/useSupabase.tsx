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

  const client = supabaseClient;

  return {
    client,
    isAuthorizedUser,
    isAuthenticated,
  };
};
