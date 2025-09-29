import { useState, useEffect } from "react";

/**
 * Custom hook for responsive design
 * @returns {Object} - Responsive state and utilities
 */
export const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [screenSize, setScreenSize] = useState("desktop");

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;

      if (width < 768) {
        setIsMobile(true);
        setIsTablet(false);
        setIsDesktop(false);
        setScreenSize("mobile");
      } else if (width < 1024) {
        setIsMobile(false);
        setIsTablet(true);
        setIsDesktop(false);
        setScreenSize("tablet");
      } else {
        setIsMobile(false);
        setIsTablet(false);
        setIsDesktop(true);
        setScreenSize("desktop");
      }
    };

    // Check initial size
    checkScreenSize();

    // Add event listener
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  /**
   * Get responsive class names
   * @param {Object} classes - Object with mobile, tablet, and desktop class names
   * @returns {string} - Combined class names
   */
  const getResponsiveClasses = (classes) => {
    if (isMobile && classes.mobile) {
      return classes.mobile;
    } else if (isTablet && classes.tablet) {
      return classes.tablet;
    } else if (isDesktop && classes.desktop) {
      return classes.desktop;
    }
    return classes.default || classes.desktop || "";
  };

  /**
   * Get responsive value
   * @param {Object} values - Object with mobile, tablet, and desktop values
   * @returns {any} - Value for current screen size
   */
  const getResponsiveValue = (values) => {
    if (isMobile && values.mobile !== undefined) {
      return values.mobile;
    } else if (isTablet && values.tablet !== undefined) {
      return values.tablet;
    } else if (isDesktop && values.desktop !== undefined) {
      return values.desktop;
    }
    return values.default || values.desktop;
  };

  /**
   * Check if current screen size matches
   * @param {string} size - Size to check ('mobile', 'tablet', 'desktop')
   * @returns {boolean} - Whether current size matches
   */
  const isSize = (size) => {
    return screenSize === size;
  };

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenSize,
    getResponsiveClasses,
    getResponsiveValue,
    isSize,
  };
};
