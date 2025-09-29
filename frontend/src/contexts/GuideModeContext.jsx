import React, { createContext, useContext, useState, useEffect } from "react";

const GuideModeContext = createContext();

export const useGuideMode = () => useContext(GuideModeContext);

export const GuideModeProvider = ({ children }) => {
  // Initialize from localStorage, default to true
  const [guideMode, setGuideMode] = useState(() => {
    const saved = localStorage.getItem("guideMode");
    return saved === null ? true : saved === "true";
  });

  // Save to localStorage whenever guideMode changes
  useEffect(() => {
    localStorage.setItem("guideMode", guideMode);
  }, [guideMode]);

  return (
    <GuideModeContext.Provider value={{ guideMode, setGuideMode }}>
      {children}
    </GuideModeContext.Provider>
  );
}; 