import React from "react";
import { Moon, Sun } from "lucide-react";
import { useDarkMode } from "../context/DarkModeContext";

const DarkModeToggle: React.FC = () => {
  const { darkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-700 shadow-sm transition-all duration-200 hover:border-news-accent hover:text-news-accent focus:outline-none focus:ring-2 focus:ring-news-accent focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-news-accent dark:hover:text-white dark:focus:ring-offset-gray-900"
      aria-label={darkMode ? "ლაით რეჟიმზე გადართვა" : "დარკ რეჟიმზე გადართვა"}
      title={darkMode ? "ლაით რეჟიმი" : "დარკ რეჟიმი"}
    >
      {darkMode ? (
        <Sun size={20} className="text-yellow-400" />
      ) : (
        <Moon size={20} className="text-gray-700" />
      )}
    </button>
  );
};

export default DarkModeToggle;
