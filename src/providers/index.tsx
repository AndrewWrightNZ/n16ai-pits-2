// Context
import { MapSettingsProvider } from "../maps/_shared/context/useMapSettingsContext";

export const GeneralProviders = ({ children }: any) => {
  return <MapSettingsProvider>{children}</MapSettingsProvider>;
};

export default GeneralProviders;
