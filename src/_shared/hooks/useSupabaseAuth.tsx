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
        console.error("Error getting session:", error);
        setUser(null);
      } else if (data && data.session) {
        setUser(data.session.user);
        console.log("Existing session found:", {
          user: data.session.user,
          isAdmin: data.session.user?.email
            ? ADMIN_EMAILS.includes(data.session.user.email)
            : false,
        });

        // Test if the session is valid with a simple query
        const { error: testError } = await freshClient
          .from("pub")
          .select("count")
          .limit(1);
        if (testError) {
          console.error("Session test failed:", testError);
        } else {
          console.log("Session test succeeded");
        }
      } else {
        console.log("No existing session found");
        setUser(null);
      }

      // Set up auth state change listener
      const { data: authListener } = freshClient.auth.onAuthStateChange(
        async (event, session) => {
          setUser(session?.user || null);

          // If we get a signed_in event, refresh the client
          if (event === "SIGNED_IN" && session) {
            console.log("User signed in, refreshing client");
          }
        }
      );

      setIsLoading(false);

      return () => {
        authListener?.subscription.unsubscribe();
      };
    } catch (e) {
      console.error("Error initializing Supabase client:", e);
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
        console.log("Signed in successfully:", {
          user: data.user,
          isAdmin: data.user?.email
            ? ADMIN_EMAILS.includes(data.user.email)
            : false,
        });
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
