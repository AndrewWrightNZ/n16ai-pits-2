// Providers
import {
  EarlyAccessState,
  useEarlyAccessContext,
} from "../../providers/EarlyAccessProvider";

// Hooks
import useDeviceDetect from "../useDeviceDetect";
import useCommunication from "../communication/useCommunication";

//

// Types
interface EarlyAccessData extends EarlyAccessState {}

interface EarlyAccessOperations {
  // Public access
  onUnlockPublicAccess: () => void;
}

interface EarlyAccessResponse {
  data: EarlyAccessData;
  operations: EarlyAccessOperations;
}

//

const useEarlyAccess = (): EarlyAccessResponse => {
  //

  // Context
  const { earlyAccessState } = useEarlyAccessContext();

  //

  // Hooks
  const {
    operations: { onSendSlackMessage },
  } = useCommunication();

  const { isMobile } = useDeviceDetect();

  //

  // Handlers
  const onUnlockPublicAccess = () => {
    // Ping slack about access code used
    onSendSlackMessage({
      messageText: `:key: Public Access used - ${isMobile ? "(Mobile)" : "(Desktop)"}`,
      channelName: "azul-usage",
    });
  };

  return {
    data: {
      ...earlyAccessState,
    },
    operations: {
      // Unlock public access
      onUnlockPublicAccess,
    },
  };
};

export default useEarlyAccess;
