import { ReactNode } from "react";
import { LoadScript, Libraries } from "@react-google-maps/api";

interface GoogleMapsProviderProps {
  children: ReactNode;
}

// Define the libraries we want to load
const libraries: Libraries = ["places", "drawing"];

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
      {children}
    </LoadScript>
  );
}

export default GoogleMapsProvider;
