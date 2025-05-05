import {
  EarlyAccessState,
  useEarlyAccessContext,
} from "../../providers/EarlyAccessProvider";

//

// Types
interface EarlyAccessData extends EarlyAccessState {}

interface EarlyAccessOperations {
  // Show form
  onShowAccessForm: () => void;

  // Show sign up for early access
  onToggleSignUpForEarlyAccess: () => void;

  // Attempt access
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

  // Handlers
  const onShowAccessForm = () => {
    updateEarlyAccessState({
      showAccessCodeForm: true,
    });
  };

  const onAttemptEarlyAccess = () => {
    updateEarlyAccessState({
      showAccessCodeForm: true,
    });
  };

  const onToggleSignUpForEarlyAccess = () => {
    updateEarlyAccessState({
      showSignUpForEarlyAccess: true,
    });
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

      // Attempt access
      onAttemptEarlyAccess,
    },
  };
};

export default useEarlyAccess;
