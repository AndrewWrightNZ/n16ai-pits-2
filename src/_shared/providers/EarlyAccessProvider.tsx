import React, { createContext, useState, useContext, useEffect } from "react";

export interface EarlyAccessState {
  // Show access code form
  showAccessCodeForm: boolean;

  // Sign up for early access
  showSignUpForEarlyAccess: boolean;
  showSignUpSuccess: boolean;

  // Has confirmed entry
  hasConfirmedEntry: boolean;

  // Timestamp for localStorage
  timestamp: number;
}

interface EarlyAccessContextType {
  earlyAccessState: EarlyAccessState;
  updateEarlyAccessState: (newState: Partial<EarlyAccessState>) => void;
}

const EarlyAccessContext = createContext<EarlyAccessContextType | undefined>(
  undefined
);

const LOCAL_STORAGE_KEY = "earlyAccessState";

const defaultState: EarlyAccessState = {
  // Show access code form
  showAccessCodeForm: false,

  // Sign up for early access
  showSignUpForEarlyAccess: false,
  showSignUpSuccess: false,

  // Access confimred
  hasConfirmedEntry: false,

  // Timestamp for localStorage
  timestamp: Date.now(),
};

export const EarlyAccessProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [earlyAccessState, setEarlyAccessState] = useState<EarlyAccessState>(
    () => {
      // Try to load the state from localStorage on initial render
      const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);

      if (storedState) {
        const parsedState: EarlyAccessState = JSON.parse(storedState);
        const now = Date.now();
        const oneWeek = 60 * 60 * 24 * 7 * 1000; // 7 days in milliseconds

        // Check if the stored state is less than 1 week old
        if (now - parsedState.timestamp < oneWeek) {
          // If it's less than 1 week old, use the stored state
          return parsedState;
        }
      }

      return defaultState;
    }
  );

  useEffect(() => {
    // Save to localStorage whenever the state changes, including the current timestamp
    const stateToStore: EarlyAccessState = {
      ...earlyAccessState,
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToStore));
  }, [earlyAccessState]);

  const updateEarlyAccessState = (newState: Partial<EarlyAccessState>) => {
    setEarlyAccessState((prevState) => ({ ...prevState, ...newState }));
  };

  return (
    <EarlyAccessContext.Provider
      value={{ earlyAccessState, updateEarlyAccessState }}
    >
      {children}
    </EarlyAccessContext.Provider>
  );
};

export const useEarlyAccessContext = (): EarlyAccessContextType => {
  const context = useContext(EarlyAccessContext);
  if (!context) {
    throw new Error(
      "useEarlyAccessContext must be used within a EarlyAccessProvider"
    );
  }
  return context;
};
