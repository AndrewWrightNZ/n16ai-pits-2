import { useState } from "react";

// Maps
import PhotorealisticMap from "./maps/PhotorealisticMap";
import ThreeDTilesMap from "./maps/ThreeDTilesMap";

const App = () => {
  const [mapType, setMapType] = useState("3d");

  return (
    <>
      <p>Select the type of map you'd like to use</p>

      <button onClick={() => setMapType("basic")}>Basic</button>
      <button onClick={() => setMapType("3d")}>3D Tiles Map</button>

      {mapType === "basic" && <PhotorealisticMap />}

      {mapType === "3d" && <ThreeDTilesMap />}
    </>
  );
};

export default App;
