import { useCallback, useEffect, useState } from "react";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase credentials are not available");
}

// Create the anonymous client for public access
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Create a context for storing the auth client globally
let globalAuthClient: SupabaseClient | null = null;

// Admin emails for authorization
const ADMIN_EMAILS = ["andrew@outerlands.co"];

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

  // Check if the user is an authorized admin
  const isAuthorizedUser = user?.email
    ? ADMIN_EMAILS.includes(user.email)
    : false;

  /**
   * Initialize the client and check for existing session
   */
  const initializeClient = useCallback(async () => {
    try {
      // Always start with a fresh client
      const freshClient = createClient(supabaseUrl, supabaseAnonKey);
      globalAuthClient = freshClient;
      setClient(freshClient);

      // Check for existing session
      const { data, error } = await freshClient.auth.getSession();

      if (error) {
        setUser(null);
      } else if (data && data.session) {
        setUser(data.session.user);
      } else {
        setUser(null);
      }

      // Set up auth state change listener
      const { data: authListener } = freshClient.auth.onAuthStateChange(
        async (_, session) => {
          setUser(session?.user || null);
        }
      );

      setIsLoading(false);

      return () => {
        authListener?.subscription.unsubscribe();
      };
    } catch (e) {
      setClient(supabaseClient);
      setUser(null);
      setIsLoading(false);
    }
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
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data && data.user) {
        setUser(data.user);
      }
    } catch (error) {
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
      setUser(null);
      console.log("Signed out successfully");
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
