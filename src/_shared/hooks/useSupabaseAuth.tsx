import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase credentials are not available");
}

// Create the anonymous client for public access
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Create a context for storing the auth client globally
let globalAuthClient: SupabaseClient | null = null;

type HookShape = {
  data: {
    isLoading: boolean;
    isAuthenticated: boolean;
    user: User | null;
    isAuthorizedUser: boolean;
  };
  operations: {
    onSignIn: (email: string, password: string) => Promise<void>;
    onSignOut: () => Promise<void>;
    getClient: () => SupabaseClient;
  };
};

/**
 * Hook to manage Supabase authentication
 */
export const useSupabaseAuth = (): HookShape => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<SupabaseClient>(
    globalAuthClient || supabaseClient
  );

  // Check if the user is the authorized user with specific ID
  const isAuthorizedUser = user?.id === "b7914936-cd8e-4a07-a1a1-0a2f4ef38bf0";

  /**
   * Initialize the client and check for existing session
   */
  const initializeClient = useCallback(async () => {
    if (!globalAuthClient) {
      globalAuthClient = supabaseClient;
    }

    setClient(globalAuthClient);

    // Check for existing session
    const { data } = await globalAuthClient.auth.getSession();
    if (data && data.session) {
      setUser(data.session.user);
    }

    setIsLoading(false);

    // Set up auth state change listener
    const { data: authListener } = globalAuthClient.auth.onAuthStateChange(
      async (_, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeClient();
  }, [initializeClient]);

  /**
   * Sign in with email and password
   */
  const onSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign out
   */
  const onSignOut = async () => {
    setIsLoading(true);
    try {
      await client.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get the current client
   */
  const getClient = () => client;

  return {
    data: {
      isLoading,
      isAuthenticated: !!user,
      user,
      isAuthorizedUser,
    },
    operations: {
      onSignIn,
      onSignOut,
      getClient,
    },
  };
};

export default useSupabaseAuth;
