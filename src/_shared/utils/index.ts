import CryptoJS from "crypto-js";

// Types

// Emojis
import beerEmoji from "/beer.png";
import sunEmoji from "/sun.png";
import cloudEmoji from "/cloudy.png";
import partialSunEmoji from "/partial_sun.png";
import { Pub, SunEvaluation } from "../types";

//
// Set the base URL for the REST API
export const MODEL_MANAGEMENT_API_URL =
  import.meta.env.VITE_ENVIRONMENT === "development"
    ? "http://localhost:3001"
    : "https://mm-api.n16ai.com";

export const headers = {
  "Content-Type": "application/json",
};

export const splitIntoTwoByTwo = (inputString: string) => {
  //

  // Return the 1st, 2nd, 4th and 5th characters
  return `${inputString.slice(0, 2)}-${inputString.slice(3, 5)}`;
};

export const getSunEvalEmoji = (sunEval: SunEvaluation) => {
  let sunEvaluationEmoji = "☁️";

  if (sunEval.eval === "full_sun") {
    sunEvaluationEmoji = "☀️";
  } else if (sunEval.eval === "partial_sun") {
    sunEvaluationEmoji = "🌤️";
  } else if (sunEval.eval === "no_sun") {
    sunEvaluationEmoji = "☁️";
  }

  return sunEvaluationEmoji;
};

export const roundUpCurrentTime = (formattedCurrentTime: string[]) => {
  // Extract hours and minutes from the input array
  const [hours, minutes] = formattedCurrentTime.map(Number);

  // Calculate the total minutes
  let totalMinutes = hours * 60 + minutes;

  // Round up to the next 15-minute interval
  totalMinutes = Math.ceil(totalMinutes / 15) * 15;

  // Calculate new hours and minutes
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;

  // Format the result back to a string
  const formattedReturnString = `${newHours.toString().padStart(2, "0")}-${newMinutes.toString().padStart(2, "0")}`;

  // If this is below 10-00, return 10-00
  if (newHours < 10 || (newHours === 10 && newMinutes === 0)) {
    return "10-00";
  }

  // If this is above 19-00, return 19-00
  if (newHours > 21 || (newHours === 21 && newMinutes > 0)) {
    return "21-00";
  }

  return formattedReturnString;
};

export const formatAddressText = (addressText: string) => {
  const simplifiedAddress = addressText.replace("London", "");

  const addressParts = simplifiedAddress.split(", ");
  const trimmedAddressParts = addressParts.map((part) => part.trim());

  // Return the first 3 parts of the address
  return `${trimmedAddressParts[0]}, ${trimmedAddressParts[1]}, ${trimmedAddressParts[2]}`;
};

export const formatFilterButtonText = (filter: string) => {
  if (filter === "full_sun") {
    return "Full Sun";
  } else if (filter === "partial_sun") {
    return "Partial Sun";
  } else if (filter === "no_sun") {
    return "No Sun";
  }

  return filter;
};

export const formatFilterToEmoji = (filter: string) => {
  if (filter === "full_sun") {
    return "☀️";
  } else if (filter === "partial_sun") {
    return "🌤️";
  } else if (filter === "no_sun") {
    return "☁️";
  }

  return filter;
};

//

// Standard helper function which makes the request to the server for React Query hooks

interface MakeRequestToRESTApiProps {
  // The URL suffix to be appended to the base URL
  urlSuffix: string;
  urlId?: string;
}

export async function makeRequestToRESTApi({
  urlSuffix,
  urlId,
}: MakeRequestToRESTApiProps) {
  // Confirm the ID suffix
  const idSuffix = urlId ? `/${urlId}` : "";

  // Call REST API
  const url = `${MODEL_MANAGEMENT_API_URL}/${urlSuffix}${idSuffix}`;

  try {
    const response = await fetch(url);
    const receivedData = await response.json();

    const extractedData = receivedData?.data || {};

    return extractedData;
  } catch (error) {
    console.error("Error making request:", error);
    throw error; // Rethrow the error to handle it in the calling code
  }
}

export const getCurrentUnixTime = () => {
  const currentDateTime = new Date();

  // Check if the date is valid
  if (isNaN(currentDateTime.getTime())) {
    console.error("Invalid date created. Using fallback.");
    // Fallback to current timestamp
    return Date.now();
  }

  const currentUnixTime = currentDateTime.getTime();

  return currentUnixTime;
};

//

// Select the right Emoji to use

interface SelectCorrectEmojiProps {
  isPubSelected: boolean;
  currentSunEval: string;
  filterName: string;
}

export function selectCorrectEmoji({
  isPubSelected,
  currentSunEval,
  filterName,
}: SelectCorrectEmojiProps) {
  let markerEmoji = cloudEmoji;

  if (isPubSelected && currentSunEval) {
    markerEmoji =
      currentSunEval === "full_sun"
        ? sunEmoji
        : currentSunEval === "partial_sun"
          ? partialSunEmoji
          : cloudEmoji;
  } else {
    switch (filterName) {
      case "full_sun":
        markerEmoji = sunEmoji;
        break;
      case "partial_sun":
        markerEmoji = partialSunEmoji;
        break;
      case "no_sun":
        markerEmoji = cloudEmoji;
        break;
      default:
        markerEmoji = beerEmoji;
    }
  }

  return markerEmoji;
}

export function getSunCircleClassFromPercentage(percentage: number) {
  if (percentage >= 75) {
    return "bg-amber-300"; // Bright yellow circle for high sun percentage
  } else if (percentage >= 50) {
    // For percentages between 50-75%, return an empty string as we'll use inline styles
    return "sun-half-marker"; // Custom class for half sun markers
  } else {
    return "bg-gray-200"; // Gray circle for low sun percentage
  }
}

export const truncateString = (inputString: string, maxLength: number) => {
  if (inputString.length > maxLength) {
    return `${inputString.slice(0, maxLength)}...`;
  }

  return inputString;
};

export const filterPubsBySunEvaluation = (
  pubs: Pub[],
  rawSunEvaluationsByTimeStamp: SunEvaluation[],
  targetEvaluation: "full_sun" | "partial_sun" | "no_sun"
): Pub[] => {
  return pubs.filter((pub) => {
    const sunEvalsForPub = rawSunEvaluationsByTimeStamp.filter(
      ({ pub_id }) => pub_id === pub.id
    );
    return sunEvalsForPub.some(
      ({ eval: sunEval }) => sunEval === targetEvaluation
    );
  });
};

//

// Encryption

const secretKey = import.meta.env.VITE_ENCRYPTION_KEY;

export const encryptString = (inputString: string) => {
  // Ensure the key is 32 bytes long
  const key = CryptoJS.enc.Utf8.parse(secretKey.padEnd(32, "\0").slice(0, 32));

  console.log("key", key);
  const encrypted = CryptoJS.AES.encrypt(inputString, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });

  const encryptedBase64 = encrypted.toString();

  return encryptedBase64;
};

//

// Timeslots

/**
 * Maps the current time to an integer index where:
 * - 12:00pm (noon) = 0
 * - 12:15pm = 1
 * - 12:30pm = 2
 * - And so on in 15-minute increments until 9:00pm
 *
 * @returns The time slot index (0-36) or -1 if outside the 12pm-9pm range
 */
export const getCurrentTimeSlot = (): number => {
  const currentTime = new Date();

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();

  // Convert to 12-hour format for calculation
  // 12pm (noon) = 12, 1pm = 13, 2pm = 14, ..., 9pm = 21

  // If time is before noon (12pm) or after 9pm, return -1
  if (hours < 12 || hours > 21 || (hours === 21 && minutes > 0)) {
    return 0;
  }

  // Calculate slots since noon (12pm)
  // Each hour has 4 slots (15-min increments)
  const hoursSinceNoon = hours - 12;
  const slotsByHour = hoursSinceNoon * 4;

  // Calculate which 15-minute slot within the current hour
  const slotInCurrentHour = Math.floor(minutes / 15);

  // Combine to get the total slot number
  const timeSlot = slotsByHour + slotInCurrentHour;

  return timeSlot;
};

/**
 * Gets the formatted time string (HH-MM) for the current time
 *
 * @returns Formatted time string (e.g., "14-30" for 2:30pm)
 */
export const getFormattedTimeString = () => {
  const currentTime = new Date();

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();

  const formattedHours = hours.toString().padStart(2, "0");
  const formattedMinutes = minutes.toString().padStart(2, "0");

  return `${formattedHours}-${formattedMinutes}`;
};
