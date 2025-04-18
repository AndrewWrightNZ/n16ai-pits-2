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
    setShowBanner(false);
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
        fixed bottom-2.5 left-0 right-0 mx-auto
        w-[90vw] md:w-[80vw]
        flex flex-row items-center justify-between
        gap-2 sm:gap-4
        p-3 sm:p-2.5 sm:pl-5
        rounded-t-lg sm:rounded-full
        shadow-md bg-white
        transition-transform duration-500 ease-in-out z-50
        white-shadow
        ${showBanner && !userHasAcceptedCookies ? "translate-y-0" : "translate-y-[200%]"}
      `}
      style={{
        visibility:
          showBanner && !userHasAcceptedCookies ? "visible" : "hidden",
      }}
    >
      <p className="font-poppins font-bold text-xs text-center sm:text-left w-full text-[#2962FF]">
        This website uses cookies to ensure you get the best experience on our
        website.
      </p>
      <button
        onClick={acceptCookies}
        className="
          py-2 px-5
          rounded-full
          bg-white
          border-2 border-[#2962FF]
          text-[#2962FF]
          cursor-pointer
          shadow-none
          font-poppins font-bold
          text-sm
          min-w-[100px]
          hover:shadow-lg
          transition-shadow duration-300
        "
      >
        Got it!
      </button>
    </div>
  );
};

export default CookieBanner;
