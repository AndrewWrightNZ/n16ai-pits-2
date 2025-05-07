import { useState, useEffect, useRef } from "react";

// Utility function for debouncing
const debounce = <F extends (...args: any[]) => any>(
  func: F,
  delay: number
) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<F>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  } as F;
};

// Icons
import { ChevronRight } from "lucide-react";

// Assets
import sunLogo from "../../assets/biggerBolderSun.svg";
import usePubs from "../../_shared/hooks/pubs/usePubs";

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
  const {
    operations: { onSaveNewPub },
  } = usePubs();

  // Refs
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // State for the currently displayed pub type
  const [currentPubTypeIndex, setCurrentPubTypeIndex] = useState(0);
  const [currentPubType, setCurrentPubType] = useState(PUB_TYPES[0]);

  const [showSuccess, setShowSuccess] = useState(false);

  // Animation state - just a simple fade
  const [isVisible, setIsVisible] = useState(true);

  // State for the entered pub name
  const [enteredPubName, setEnteredPubName] = useState("");

  // State for selected place
  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);

  // State for search predictions
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!window.google || !inputRef.current) return;

    // Check if the Google Maps API is loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      // Initialize the Places Autocomplete
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["establishment"],
          componentRestrictions: { country: "gb" }, // Restrict to UK
        }
      );

      // Add listener for place selection
      if (autocompleteRef.current) {
        autocompleteRef.current.addListener("place_changed", () => {
          if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace();

            if (place && place.name) {
              const address = place.formatted_address || "";
              const postcode = extractPostcode(address);
              const pubName = place.name + (postcode ? ", " + postcode : "");

              setEnteredPubName(pubName);
              setSelectedPlace(place);
            }
          }
        });
      }
    }

    return () => {
      // Clean up listener when component unmounts
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(
          autocompleteRef.current
        );
      }
    };
  }, []);

  // Function to extract postcode from address
  const extractPostcode = (address: string) => {
    // UK postcode regex pattern
    const postcodeRegex = /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i;
    const match = address.match(postcodeRegex);
    return match ? match[0] : "";
  };

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
    // Extract latitude and longitude if a place is selected
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (
      selectedPlace &&
      selectedPlace.geometry &&
      selectedPlace.geometry.location
    ) {
      // Extract coordinates from the place object
      latitude = selectedPlace.geometry.location.lat();
      longitude = selectedPlace.geometry.location.lng();

      const firstPartOfName = enteredPubName.split(",")[0];

      const newPubToSave = {
        id: Date.now(),
        name: firstPartOfName,
        address_text: selectedPlace.formatted_address || "",
        latitude,
        longitude,
        user_submitted: true,
      };

      onSaveNewPub(newPubToSave);
    }

    setEnteredPubName("");
    setSelectedPlace(null);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  // Debounced search function
  const debouncedSearch = debounce((searchValue: string) => {
    // Clear predictions if input is empty
    if (!searchValue.trim()) {
      setPredictions([]);
      return;
    }

    console.log(window.google.maps.places);

    // Get predictions from Google Places API
    if (window.google && window.google.maps && window.google.maps.places) {
      const autocompleteService =
        new window.google.maps.places.AutocompleteService();

      autocompleteService.getPlacePredictions(
        {
          input: searchValue,
          types: ["establishment"],
          componentRestrictions: { country: "gb" },
        },
        (predictions, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            setPredictions(predictions);
          } else {
            setPredictions([]);
          }
        }
      );
    }
  }, 300);

  // Handle manual text input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEnteredPubName(value); // Update state immediately for responsive UI
    debouncedSearch(value); // Debounce the search functionality
  };

  // Handle prediction selection
  const handlePredictionSelect = (
    prediction: google.maps.places.AutocompletePrediction
  ) => {
    setEnteredPubName(prediction.description);
    setPredictions([]);

    // Get place details
    if (window.google && window.google.maps && window.google.maps.places) {
      const placesService = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
      placesService.getDetails(
        {
          placeId: prediction.place_id,
          fields: ["name", "formatted_address", "geometry", "place_id"],
        },
        (place, status) => {
          console.log({ place });
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place
          ) {
            const address = place.formatted_address || "";
            const postcode = extractPostcode(address);
            const pubName = place.name + (postcode ? ", " + postcode : "");

            setEnteredPubName(pubName);
            setSelectedPlace(place);
          }
        }
      );
    }
  };

  // Auto-cycle through pub types every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      cycleToNextPubType();
    }, 5000);

    return () => clearInterval(interval);
  }, [currentPubTypeIndex]);

  return (
    <div className="flex h-screen items-start mt-[60vw] md:mt-[30vh] justify-center">
      {/* Big Bold Sun Image - positioned independently with its own opacity transition */}
      <div className="fixed top-[20vw] md:top-[-0vh] right-[-40vw] md:right-[10vw] z-10 w-[100vw] md:w-[48vw] w-[100vw] md:h-[48vw] transition-all duration-1500 ease-in-out">
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

        <div className="flex w-full flex-col items-start justify-start gap-4 mt-12 md:mt-16 max-w-[400px]">
          <p className="text-white text-left text-sm">
            Search for your{" "}
            <span
              className={`inline-block font-black ${
                isVisible ? "opacity-100" : "opacity-0"
              } transition-opacity duration-300 ease-in-out`}
            >
              {currentPubType.split(" ")[1]} {currentPubType.split(" ")[2]}
            </span>
          </p>
          <div className="relative w-full">
            <input
              ref={inputRef}
              type="text"
              autoFocus
              className="w-full border-white bg-[#2962FF] border-2 rounded-md p-4 h-16 text-white placeholder:text-gray-200"
              placeholder="The Spurstowe Arms, E8"
              value={enteredPubName}
              onChange={handleInputChange}
            />

            {/* Predictions List */}
            {predictions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-y-auto">
                {predictions.map((prediction) => (
                  <div
                    key={prediction.place_id}
                    className="p-3 hover:bg-gray-100 cursor-pointer text-[#2962FF] border-b border-gray-100"
                    onClick={() => handlePredictionSelect(prediction)}
                  >
                    {prediction.description}
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedPlace && (
            <button
              onClick={handleSubmitAPub}
              disabled={enteredPubName.trim() === ""}
              className="flex flex-row items-center justify-center h-16 p-4 w-full bg-white text-[#2962FF] font-poppins cursor-pointer font-bold rounded-md transition-all duration-300 hover:opacity-70 disabled:opacity-50"
            >
              Submit <ChevronRight className="w-6 h-6" />
            </button>
          )}
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
