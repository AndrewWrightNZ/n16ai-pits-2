import { Helmet } from "react-helmet";
import { useState, useEffect } from "react";

// Icons
import { ChevronRight } from "lucide-react";

// Assets
import sunLogo from "../../assets/biggerBolderSun.svg";
import CookieBanner from "./_shared/components/cookieBanner";

// Hooks
import useMapMarkers from "../../_shared/hooks/mapMarkers/useMapMarkers";

function App() {
  const [showContent, setShowContent] = useState(false);

  // Hooks
  const {
    data: { goodSunCount = 0, someSunCount = 0 },
  } = useMapMarkers();

  const totalInTheSun = goodSunCount + someSunCount;
  const primaryActionButtonText = `${totalInTheSun} in the sun now`;
  const secondaryActionButtonText = `Missed one? Contact us`;

  useEffect(() => {
    // Show the content after a delay (simulating your original timeout)
    const contentTimer = setTimeout(() => {
      setShowContent(true);
    }, 500);

    return () => clearTimeout(contentTimer);
  }, []);

  const handleSeePubs = () => {
    // Navigate to finder page
    window.location.href = "/finder";
  };

  const handleContactUs = () => {
    // Open a new email
    window.open(
      "mailto:hello@pubsinthesun.com?subject=I know a great pub in the sun",
      "_blank"
    );
  };

  return (
    <>
      {/* Define custom animation keyframes and styles */}
      <style>
        {`
          @keyframes slow-spin {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          .white-shadow {
            filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3));
            transition: filter 0.3s ease-in-out;
          }
          
          .white-shadow:hover {
            filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.7));
          }
        `}
      </style>

      <Helmet>
        <title>
          Pubs in the Sun | Find Sunny Beer Gardens/Terraces/Pavements Near You
        </title>
        <meta
          name="description"
          content="Discover the best pubs with sunny beer gardens, terraces, pavements and outdoor seating near you. Perfect for summer days and warm evenings."
        />
      </Helmet>

      <main>
        {/* Main container */}
        <div className="flex flex-col items-center justify-start md:justify-center min-h-screen bg-[#2962FF] font-poppins overflow-hidden relative">
          {/* Big Bold Sun Image - positioned independently with its own opacity transition */}
          <div
            className={`fixed top-[30vw] md:top-[-0vh] right-[-30vw] md:right-[10vw] z-10 w-[100vw] md:w-[48vw] w-[100vw] md:h-[48vw] transition-all duration-1500 ease-in-out ${
              showContent ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className="w-full h-full [animation:slow-spin_20s_linear_infinite]"
              style={{
                maskImage: `url(${sunLogo})`,
                WebkitMaskImage: `url(${sunLogo})`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                backgroundColor: "#FFCC00",
              }}
              aria-label="Sun"
            />
          </div>

          {/* Content container */}
          <div className="relative flex flex-col z-20 w-[85vw] md:w-[80vw] mx-auto mt-[40vh] md:mt-0 ">
            {/* Content wrapper with opacity transition */}
            <div
              className={`transition-all duration-1000 md:mt-[15vh] ${
                showContent ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Heading */}
              <h1 className="text-[6.5rem] md:text-[12.5rem] font-black text-white font-poppins mb-12 md:mb-6 leading-[1.1] max-w-[80vw]  md:max-w-[700px]">
                Pubs in the
              </h1>

              {/* Call to action buttons */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6 mb-8 md:mt-0">
                {/* Primary Button */}
                <button
                  onClick={handleSeePubs}
                  className="white-shadow bg-[#2962FF] flex cursor-pointer items-center justify-between border-2 border-white px-6 py-3 text-white font-medium rounded-full transition-all duration-300 ease-in-out"
                >
                  <span>{primaryActionButtonText}</span>
                  <ChevronRight className="h-6 w-6 ml-2" />
                </button>

                {/* Secondary Button */}
                <button
                  onClick={handleContactUs}
                  className="px-6 py-3 bg-transparent text-white font-medium rounded-full transition-all duration-300 hover:bg-white hover:text-black"
                >
                  {secondaryActionButtonText}
                </button>
              </div>
            </div>
          </div>

          {/* Cookie Banner */}
          <CookieBanner />
        </div>
      </main>
    </>
  );
}

export default App;
