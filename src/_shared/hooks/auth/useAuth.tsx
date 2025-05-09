import { useAuth0 } from "@auth0/auth0-react";

//

// ADMIN Emails
const ADMIN_EMAILS = ["andrew@outerlands.co"];

type HookShape = {
  data: {
    isLoading: boolean;
    isAuthenticated: boolean;
    user: any;
    isAdmin: boolean;
  };
  operations: {
    onSignIn: (returnTo?: string) => void;
    onSignUp: () => void;
    onSignOut: () => void;
    getToken: () => Promise<string>;
  };
};

const useAuth = (): HookShape => {
  //

  // Hooks
  const {
    isLoading,
    isAuthenticated,
    user,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  //

  // Handlers

  const onSignIn = async (returnTo?: string) => {
    await loginWithRedirect({
      appState: { returnTo: returnTo || "" },
    });
  };

  const onSignUp = async () => {
    await loginWithRedirect({
      authorizationParams: {
        screen_hint: "signup",
        redirect_uri: window.location.origin,
      },
    });
  };

  const onSignOut = async () => {
    await logout({
      logoutParams: { returnTo: window.location.origin },
    });
  };

  const getToken = async () => {
    return await getAccessTokenSilently();
  };

  //

  // Custom variables
  const isAdmin = ADMIN_EMAILS.includes(user?.email || "xyz");

  return {
    data: {
      isLoading,
      isAuthenticated,
      user,
      isAdmin,
    },
    operations: {
      onSignIn,
      onSignUp,
      onSignOut,
      getToken,
    },
  };
};

export default useAuth;
