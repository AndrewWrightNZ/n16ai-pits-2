import { ReactNode } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";

interface GoogleMapsProviderProps {
  children: ReactNode;
}

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  return <APIProvider apiKey={apiKey}>{children}</APIProvider>;
}

export default GoogleMapsProvider;
