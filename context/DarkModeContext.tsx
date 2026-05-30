import React, { createContext, useContext, useEffect, useState } from "react";

interface DarkModeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(
  undefined,
);

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    try {
      const savedPreference = localStorage.getItem("darkMode");
      if (savedPreference !== null) {
        return JSON.parse(savedPreference);
      }
    } catch {
      // Some embedded browsers can block localStorage; keep the theme usable.
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    try {
      localStorage.setItem("darkMode", JSON.stringify(darkMode));
    } catch {
      // Theme still changes for the current session.
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkModeState((prev) => !prev);
  };

  const setDarkMode = (enabled: boolean) => {
    setDarkModeState(enabled);
  };

  const value = {
    darkMode,
    toggleDarkMode,
    setDarkMode,
  };

  return (
    <DarkModeContext.Provider value={value}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = (): DarkModeContextType => {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error("useDarkMode must be used within a DarkModeProvider");
  }
  return context;
};
