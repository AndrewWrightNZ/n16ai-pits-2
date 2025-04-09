import sunLogo from "../../assets/bigBoldSun.svg";
import { useEffect } from "react";
import { Helmet } from "react-helmet";

function App() {
  // Animation for sun logo
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      .spin-animation {
        animation: spin 10s linear infinite;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
          <div className="flex justify-center mb-4">
            <img
              src={sunLogo}
              className="w-20 h-20 spin-animation"
              alt="Pubs in the Sun logo - a bright sun"
            />
          </div>
          <h2 className="text-2xl font-medium font-poppins mb-2 text-center">
            Summer is coming
          </h2>
          <p className="text-sm font-normal font-poppins text-center">
            <time dateTime="2025-05">May 2025</time>
          </p>
        </main>

        <footer className="absolute bottom-4 text-xs text-gray-500 font-poppins">
          <p>© 2025 Pubs in the Sun. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}

export default App;
