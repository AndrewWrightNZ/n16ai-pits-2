import { useNavigate } from "@tanstack/react-router";

// Providers
import {
  EarlyAccessState,
  useEarlyAccessContext,
} from "../../providers/EarlyAccessProvider";

// Hooks
import useCommunication from "../communication/useCommunication";
import { VALID_ACCESS_CODES } from "./accessCodes";

//

// Types
interface EarlyAccessData extends EarlyAccessState {}

interface EarlyAccessOperations {
  // Show form
  onShowAccessForm: () => void;

  // Show sign up for early access
  onToggleSignUpForEarlyAccess: () => void;
  onSignUpForEarlyAccess: (emailAddress: string) => void;

  // Attempt access
  onUpdateAccessCode: (accessCode: string) => void;
  onAttemptEarlyAccess: () => void;
}

interface EarlyAccessResponse {
  data: EarlyAccessData;
  operations: EarlyAccessOperations;
}

//

const useEarlyAccess = (): EarlyAccessResponse => {
  //

  // Context
  const { earlyAccessState, updateEarlyAccessState } = useEarlyAccessContext();

  //

  // Variables
  const { showSignUpForEarlyAccess, enteredAccessCode } =
    earlyAccessState || {};

  //

  // Hooks
  const {
    operations: { onSendSlackMessage },
  } = useCommunication();
  const navigate = useNavigate();

  //

  // Handlers
  const onShowAccessForm = () => {
    updateEarlyAccessState({
      showAccessCodeForm: true,
    });
  };

  const onUpdateAccessCode = (accessCode: string) => {
    updateEarlyAccessState({
      enteredAccessCode: accessCode,
    });

    const isCodeValid = VALID_ACCESS_CODES.includes(accessCode);

    //

    // Hide the access code form and show the success message
    if (isCodeValid) {
      updateEarlyAccessState({
        showAccessCodeEnteredSuccess: true,
      });
    }
  };

  const onAttemptEarlyAccess = () => {
    updateEarlyAccessState({
      hasConfirmedEntry: true,
    });

    //

    // Ping slack about access code used
    onSendSlackMessage({
      messageText: `:key: Early Access code used: ${enteredAccessCode}`,
      channelName: "azul-early-access",
    });

    // Redirect to /finder with tansatck router
    navigate({
      to: "/finder",
    });
  };

  const onToggleSignUpForEarlyAccess = () => {
    updateEarlyAccessState({
      showSignUpForEarlyAccess: !showSignUpForEarlyAccess,
    });
  };

  const onSignUpForEarlyAccess = (emailAddress: string) => {
    //

    // Send the slack ping off
    onSendSlackMessage({
      messageText: `:eyes: New early access sign up: ${emailAddress}`,
      channelName: "azul-waitlist",
    });

    //

    // Show temporary success message
    updateEarlyAccessState({
      showSignUpSuccess: true,
    });

    //

    // After 5 seconds, flip back to adding the code
    setTimeout(() => {
      updateEarlyAccessState({
        showSignUpSuccess: false,
        showSignUpForEarlyAccess: false,
      });
    }, 5000);
  };

  return {
    data: {
      ...earlyAccessState,
    },
    operations: {
      // Show access form
      onShowAccessForm,

      // Show sign up for early access
      onToggleSignUpForEarlyAccess,
      onSignUpForEarlyAccess,

      // Update access code
      onUpdateAccessCode,

      // Attempt access
      onAttemptEarlyAccess,
    },
  };
};

export default useEarlyAccess;
