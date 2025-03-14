// Maps
import ThreeDTilesMap from "./maps/PhotorealisticTilesMap";

// Context
import { MapSettingsProvider } from "./maps/_shared/context/useMapSettingsContext";

const App = () => {
  return (
    <>
      <MapSettingsProvider>
        <ThreeDTilesMap />
      </MapSettingsProvider>
    </>
  );
};

export default App;
