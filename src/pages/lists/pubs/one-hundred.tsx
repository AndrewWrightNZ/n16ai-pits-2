import { Helmet } from "react-helmet";
import { useState, useEffect } from "react";

// Icons
import { ChevronDown } from "lucide-react";

// Assets
import sunLogo from "../../../assets/bigBoldSun.svg";

// Components
import PitsOneHundredPubsList from "./pubsList";

const OneHundred = () => {
  // State to track sun visibility
  const [showSun, setShowSun] = useState(true);

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;

      // Show sun when at top, hide when scrolled past threshold
      if (scrollPosition > 10) {
        setShowSun(false);
      } else {
        setShowSun(true);
      }
    };

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll);

    // Initial check in case page loads with scroll
    handleScroll();

    // Clean up
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleScrollToList = () => {
    const listElement = document.getElementById("pubs-list");
    if (listElement) {
      listElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
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
          
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          
          @keyframes slideUp {
            from { transform: translateY(0); }
            to { transform: translateY(-30vh); }
          }
          
          .white-shadow {
            filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3));
            transition: filter 0.3s ease-in-out;
          }
          
          .white-shadow:hover {
            filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.7));
          }

          .number-gradient {
            background: linear-gradient(135deg, #FFD700, #FFA500);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            display: inline-block;
          }
          
          .sun-visible {
            animation: fadeIn 0.2s ease-in-out forwards;
          }
          
          .sun-hidden {
            animation: fadeOut 0.2s ease-in-out forwards;
          }
        `}
      </style>

      <Helmet>
        <title>The One Hundred | Top Pubs in the Sun in London</title>
        <meta
          name="description"
          content="Discover London's top 100 pubs with sunny beer gardens, terraces and outdoor seating. The ultimate guide to sunshine drinking spots."
        />
      </Helmet>

      <main>
        {/* Main container with transition for minimizing */}
        <div
          className={`flex flex-col items-center justify-start transition-all duration-1000 ease-in-out h-[90vh] bg-[#2962FF] font-poppins overflow-hidden relative`}
        >
          {/* Sun Image - positioned with responsive adjustments */}
          <div
            className={`fixed top-[30vw] md:top-[-0vh] right-[-30vw] md:right-[10vw] z-10 w-[100vw] md:w-[30vw] 
            transition-all duration-500 ease-in-out ${showSun ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <img
              src={sunLogo}
              className="w-full h-full [animation:slow-spin_20s_linear_infinite]"
              alt="Sun"
            />
          </div>

          {/* Content container with animation for minimizing */}
          <div
            className={`relative flex flex-col z-20 w-[95vw] mx-auto mt-[20vh] items-center justify-center transition-all duration-1000 ease-in-out`}
          >
            {/* Content wrapper with opacity transition */}
            <div
              className={`transition-all duration-1000 flex flex-col items-center justify-center`}
            >
              {/* Headings */}
              <h1 className="text-[5rem] md:text-[18rem] text-center font-black text-white font-poppins mb-8 md:mb-6 leading-[1.1]">
                PITS 100
              </h1>

              <h2 className="text-[2.5rem] md:text-[4rem] text-center font-bold text-white font-poppins mb-2 leading-tight">
                Pubs in the Sun - Top One Hundred
              </h2>
              {/* Subtitle */}
              <p className="text-white text-xl md:text-2xl mb-8 text-center">
                London's ultimate collection of sun-soaked drinking spots,
                ranked and measured.
              </p>

              {/* Action button */}
              <button
                onClick={handleScrollToList}
                className="white-shadow bg-[#2962FF] flex cursor-pointer items-center justify-between border-2 border-white px-6 py-3 text-white font-medium rounded-full transition-all duration-300 ease-in-out mb-8"
              >
                <span>View the top 100</span>
                <ChevronDown className="h-6 w-6 ml-2" />
              </button>
            </div>
          </div>
        </div>

        <PitsOneHundredPubsList />
      </main>
    </>
  );
};

export default OneHundred;
