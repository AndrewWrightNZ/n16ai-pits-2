import { useState, useEffect } from "react";

// Hooks
import useCommunications from "../../_shared/hooks/communication/useCommunication";

// Icons
import { ChevronRight } from "lucide-react";

// Assets
import sunLogo from "../../assets/biggerBolderSun.svg";
// Constants
const PUB_TYPES = [
  "a Pub",
  "a Tavern",
  "an Inn",
  "a Brewery",
  "a Tap Room",
  "a Cellar",
  "an Arms",
];

const SubmitAPub = () => {
  //

  // Hooks

  const {
    operations: { onSendSlackMessage },
  } = useCommunications();

  // State for the currently displayed pub type
  const [currentPubTypeIndex, setCurrentPubTypeIndex] = useState(0);
  const [currentPubType, setCurrentPubType] = useState(PUB_TYPES[0]);

  const [showSuccess, setShowSuccess] = useState(false);

  // Animation state - just a simple fade
  const [isVisible, setIsVisible] = useState(true);

  // State for the entered pub name
  const [enteredPubName, setEnteredPubName] = useState("");

  // Function to handle cycling to the next pub type
  const cycleToNextPubType = () => {
    // Step 1: Fade out
    setIsVisible(false);

    // Step 2: After fade out completes, change the pub type
    setTimeout(() => {
      const nextIndex = (currentPubTypeIndex + 1) % PUB_TYPES.length;
      setCurrentPubTypeIndex(nextIndex);
      setCurrentPubType(PUB_TYPES[nextIndex]);

      // Step 3: Fade back in
      setTimeout(() => {
        setIsVisible(true);
      }, 200);
    }, 300);
  };

  const handleSubmitAPub = () => {
    onSendSlackMessage({
      channelName: "#azul-pubs-to-add",
      messageText: `:mailbox_with_mail: New pub to add: ${enteredPubName}`,
    });
    setEnteredPubName("");
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  // Auto-cycle through pub types every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      cycleToNextPubType();
    }, 5000);

    return () => clearInterval(interval);
  }, [currentPubTypeIndex]);

  return (
    <div className="flex h-screen items-start mt-[60vw] md:mt-[30vh] justify-center">
      {/* Big Bold Sun Image - positioned independently with its own opacity transition */}
      <div
        className={`fixed top-[20vw] md:top-[-0vh] right-[-40vw] md:right-[10vw] z-10 w-[100vw] md:w-[48vw] w-[100vw] md:h-[48vw] transition-all duration-1500 ease-in-out`}
      >
        <div
          className="w-[80vw] md:w-[48vw] h-[80vw] md:h-[48vw] [animation:slow-spin_20s_linear_infinite]"
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
      <div className="flex flex-col items-start w-[90vw] md:w-[50vw] z-9999999 pt-[15vh]">
        <h1 className="text-5xl font-semibold font-poppins text-white text-left">
          Submit <br />
          <span
            className={`inline-block font-black ${
              isVisible ? "opacity-100" : "opacity-0"
            } transition-opacity duration-300 ease-in-out`}
          >
            {currentPubType}
          </span>
        </h1>
        <p className="text-white text-left text-sm mt-4">
          Where's missing on{" "}
          <span className="font-bold text-white">Pubs In The Sun</span>?
        </p>

        <div className="flex w-full flex-col items-start justify-start gap-4 mt-6 md:mt-16 max-w-[400px]">
          <input
            type="text"
            autoFocus
            className="w-full border-white bg-[#2962FF] border-2 rounded-md p-4 h-16 text-white placeholder:text-gray-200"
            placeholder="The Spurstowe Arms, E8"
            value={enteredPubName}
            onChange={(e) => setEnteredPubName(e.target.value)}
          />
          <p className="text-xs text-white mb-2">
            Please add the post code if you can!
          </p>
          <button
            onClick={handleSubmitAPub}
            disabled={enteredPubName.trim() === ""}
            className="flex flex-row items-center justify-center h-16 p-4 w-full bg-white text-[#2962FF] font-poppins cursor-pointer font-bold rounded-md transition-all duration-300 hover:opacity-70 disabled:opacity-50"
          >
            Submit <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {showSuccess && (
          <p className="text-white text-xs font-poppins font-bold mt-8">
            Thank you! We'll add this as soon as we can.
          </p>
        )}
      </div>
    </div>
  );
};

export default SubmitAPub;
