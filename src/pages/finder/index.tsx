import { Helmet } from "react-helmet";
import usePubs from "./_shared/hooks/usePubs";

function Finder() {
  //

  // Hooks
  const {
    data: {
      pubs = [],
      selectedPub = null,

      // Filters
      selectedFilters = [],
    },
    // operations: { onSetMapBounds },
  } = usePubs();

  console.log("Pubs in the Sun - Finder");
  console.log("Pubs:", pubs);
  console.log("Selected Pub:", selectedPub);

  console.log("Selected Filters:", selectedFilters);

  return (
    <>
      <Helmet>
        <title>
          Pubs in the Sun | Find Sunny Beer Gardens/Terraces/Pavements Near You
        </title>
        <meta
          name="description"
          content="Discover the best pubs with sunny beer gardens, terraces, pavements and outdoor seating near you. Perfect for summer days and warm evenings."
        />
      </Helmet>

      <div className="bg-[#F3F1E5] min-h-screen flex flex-col items-center justify-center">
        <header>
          <h1 className="sr-only">Pubs in the Sun</h1>
        </header>

        <main className="flex flex-col items-center justify-center">
          <h2 className="text-2xl font-medium font-poppins mb-2 text-center">
            Use the Pubs in the Sun map to find the best sunny beer gardens near
            you.
          </h2>
          <p className="text-sm font-normal font-poppins text-center">
            Search from over {pubs.length} pub we track in London
          </p>
        </main>
      </div>
    </>
  );
}

export default Finder;
