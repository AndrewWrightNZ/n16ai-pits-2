import { useState, useEffect } from "react";

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Hook to detect device type (mobile, tablet, desktop)
 * Uses a combination of screen size and user agent detection
 */
const useDeviceDetect = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true, // Default to desktop
  });

  useEffect(() => {
    // Function to update device info based on screen size and user agent
    const updateDeviceInfo = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;

      // Check for common mobile/tablet keywords in user agent
      const mobileKeywords = ["android", "iphone", "ipod", "windows phone"];
      const tabletKeywords = ["ipad", "tablet"];

      // Detect if user agent contains mobile or tablet keywords
      const hasMobileKeyword = mobileKeywords.some((keyword) =>
        userAgent.includes(keyword)
      );
      const hasTabletKeyword = tabletKeywords.some((keyword) =>
        userAgent.includes(keyword)
      );

      // Determine device type based on screen width and user agent
      // Mobile: width < 768px or mobile user agent
      // Tablet: 768px <= width < 1024px or tablet user agent
      // Desktop: width >= 1024px and no mobile/tablet user agent

      const isMobile = width < 768 || (hasMobileKeyword && !hasTabletKeyword);
      const isTablet = (width >= 768 && width < 1024) || hasTabletKeyword;
      const isDesktop = width >= 1024 && !hasMobileKeyword && !hasTabletKeyword;

      setDeviceInfo({ isMobile, isTablet, isDesktop });
    };

    // Initial check
    updateDeviceInfo();

    // Add event listener for window resize
    window.addEventListener("resize", updateDeviceInfo);

    // Clean up
    return () => {
      window.removeEventListener("resize", updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
};

export default useDeviceDetect;
