// Utils
import * as fn from "../../utils";

interface SlackMessagePayload {
  messageText: string;
  channelName: string;
}

const useCommunications = () => {
  //

  // Handlers

  const onSendSlackMessage = async ({
    messageText,
    channelName,
  }: SlackMessagePayload) => {
    try {
      //

      // Server URL
      const DEV_URL = "http://localhost:3001";
      const PROD_URL = "https://mm-api.n16ai.com";

      const isDev = import.meta.env.VITE_ENVIRONMENT === "development";
      const SERVER_URL = isDev ? DEV_URL : PROD_URL;

      const encryptedMessageText = fn.encryptString(messageText);
      const encryptedChannelName = fn.encryptString(channelName);

      //

      // Send POST request to the server with the message and channel name as the body
      await fetch(`${SERVER_URL}/s/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          m: encryptedMessageText,
          c: encryptedChannelName,
        }),
      });
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  return {
    operations: {
      onSendSlackMessage,
    },
  };
};

export default useCommunications;
