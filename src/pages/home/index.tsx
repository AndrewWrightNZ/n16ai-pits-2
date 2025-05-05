import { Helmet } from "react-helmet";
import { useState, useEffect, useRef } from "react";

// Icons
import { ChevronRight } from "lucide-react";

// Assets
import sunLogo from "../../assets/biggerBolderSun.svg";
import CookieBanner from "./_shared/components/cookieBanner";

// Hooks
import useSunEvals from "../../_shared/hooks/sunEvals/useSunEvals";
import useHeroMetrics from "../../_shared/hooks/heroMetrics/useHeroMetrics";
import { formatAreaType } from "../lists/_shared";

function App() {
  const [showContent, setShowContent] = useState(false);
  const [currentAreaTypeIndex, setCurrentAreaTypeIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const cycleTimerRef = useRef<number | null>(null);

  // Hooks
  const {
    data: {
      goodSunCount = 0,
      someSunCount = 0,
      areaTypeCountsWithSomeSun = [],
    },
  } = useHeroMetrics();
  const {
    operations: { onSeedCurrentTimeSlot },
  } = useSunEvals();

  const totalInTheSun = goodSunCount + someSunCount;

  // Initial button text shows total count
  const [primaryActionButtonText, setPrimaryActionButtonText] = useState(
    `${totalInTheSun} in the sun now`
  );
  const secondaryActionButtonText = `Missed one? Contact us`;

  useEffect(() => {
    // Show the content after a delay (simulating your original timeout)
    const contentTimer = setTimeout(() => {
      setShowContent(true);
    }, 500);

    return () => clearTimeout(contentTimer);
  }, []);

  // Update button text when total count changes
  useEffect(() => {
    setPrimaryActionButtonText(`${totalInTheSun} in the sun now`);
  }, [totalInTheSun]);

  // Effect to cycle through area types
  useEffect(() => {
    if (showContent && areaTypeCountsWithSomeSun.length > 0) {
      // Start cycling after initial content is shown
      const startCycling = setTimeout(() => {
        cycleThroughAreaTypes();
      }, 2000); // Wait 2 seconds after content appears before starting the cycle

      return () => {
        clearTimeout(startCycling);
        if (cycleTimerRef.current) {
          clearTimeout(cycleTimerRef.current);
        }
      };
    }
  }, [showContent, areaTypeCountsWithSomeSun]);

  const cycleThroughAreaTypes = () => {
    if (areaTypeCountsWithSomeSun.length <= 1) return;

    // Start transition animation
    setIsTransitioning(true);

    // After transition out completes, change the index
    setTimeout(() => {
      setCurrentAreaTypeIndex(
        (prevIndex) => (prevIndex + 1) % areaTypeCountsWithSomeSun.length
      );

      // Update button text with current area type
      const currentType = areaTypeCountsWithSomeSun[currentAreaTypeIndex];
      if (currentType) {
        setPrimaryActionButtonText(
          `${currentType.count} sunny ${formatAreaType(currentType.type)}s`
        );
      }

      // After changing index, transition back in
      setTimeout(() => {
        setIsTransitioning(false);

        // Schedule the next cycle
        cycleTimerRef.current = window.setTimeout(cycleThroughAreaTypes, 3000);
      }, 500);
    }, 500);
  };

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

  //

  // Effects
  useEffect(() => {
    // Seed the current timeslot
    onSeedCurrentTimeSlot();
  }, []);

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
          
          @keyframes slideInUp {
            from { 
              opacity: 0;
              transform: translateY(20px);
            }
            to { 
              opacity: 1;
              transform: translateY(0);
            }
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
              className="w-[100vw] md:w-[48vw] h-[100vw] md:h-[48vw] [animation:slow-spin_20s_linear_infinite]"
              style={{
                maskImage: `url(${sunLogo})`,
                WebkitMaskImage: `url(${sunLogo})`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                backgroundColor: "#FFCC00",
                zIndex: 9999,
              }}
              aria-label="Sun"
            />
          </div>

          {/* Content container */}
          <div className="relative flex flex-col z-20 w-[85vw] md:w-[80vw] mx-auto mt-[275px] md:mt-[20vh] md:mt-0">
            {/* Content wrapper with opacity transition */}
            <div
              className={`transition-all duration-1000 ${
                showContent ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Heading */}
              <h1 className="text-[6.5rem] md:text-[12.5rem] font-black text-white font-poppins mb-4 md:mb-2 leading-[1.1] max-w-[80vw] md:max-w-[700px]">
                Pubs in the
              </h1>

              {/* Call to action buttons */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6 mb-8 mt-12 md:mt-6">
                {/* Primary Button */}
                <button
                  onClick={handleSeePubs}
                  className="white-shadow bg-[#2962FF] transition-all duration-500 md:text-lg flex cursor-pointer items-center justify-between border-2 border-white px-6 py-3 md:py-4 md:px-8 text-white font-medium rounded-full transition-all duration-300 ease-in-out overflow-hidden"
                >
                  <span
                    className={`transition-all w-full md:w-fit-content text-left duration-600 ease-in-out ${isTransitioning ? "opacity-0 transform -translate-y-4" : "opacity-100 transform translate-y-0"}`}
                  >
                    {primaryActionButtonText}
                  </span>
                  <ChevronRight className="h-6 w-6 ml-2" />
                </button>

                {/* Secondary Button */}
                <button
                  onClick={handleContactUs}
                  className="md:text-lg px-6 py-3 bg-transparent text-white font-medium rounded-full transition-all duration-300 hover:bg-white hover:text-black"
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
