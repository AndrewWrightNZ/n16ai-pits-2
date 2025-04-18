import { useState, useEffect } from "react";

// Hooks
import useUserGeoLocation from "../../../../_shared/hooks/user/useGeolocation";

const CookieBanner = () => {
  // State
  const [showBanner, setShowBanner] = useState(false);

  // Hooks
  const {
    data: { userHasAcceptedCookies },
    operations: { onAcceptCookies },
  } = useUserGeoLocation();

  // Handlers
  const acceptCookies = () => {
    localStorage.setItem("cookiesAccepted", "true");
    onAcceptCookies();
  };

  // Effects, show banner after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!userHasAcceptedCookies) {
        setShowBanner(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [userHasAcceptedCookies]);

  return (
    <div
      className={`
        flex flex-row justify-between items-center w-[80vw] absolute left-[10vw] transition-all duration-500 ease-in-out rounded-full p-2.5 pl-5 shadow-md bg-secondary-light bg-white z-50 ${showBanner && !userHasAcceptedCookies ? "bottom-2.5" : "-bottom-full"}
      `}
    >
      <p className="font-poppins font-bold text-xs sm:max-w-[60vw]">
        This website uses cookies to ensure you get the best experience on our
        website.
      </p>
      <button
        onClick={acceptCookies}
        className="py-2.5 px-5 rounded-full bg-secondary-light border-2 border-primary cursor-pointer shadow-none font-poppins font-bold min-w-[100px] sm:min-w-[30px] hover:bg-secondary-light hover:border-2 hover:border-primary hover:opacity-100 hover:shadow-lg"
      >
        Got it!
      </button>
    </div>
  );
};

export default CookieBanner;
