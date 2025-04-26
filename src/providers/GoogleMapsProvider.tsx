import { ReactNode } from "react";
import { LoadScript } from "@react-google-maps/api";

interface GoogleMapsProviderProps {
  children: ReactNode;
}

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  return (
    <LoadScript googleMapsApiKey={apiKey}>
      {children}
    </LoadScript>
  );
}

export default GoogleMapsProvider;
