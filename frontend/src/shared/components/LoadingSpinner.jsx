import React from "react";
import { MdRefresh } from "react-icons/md";

/**
 * Reusable loading spinner component
 * @param {Object} props - Component props
 * @param {string} props.size - Size of the spinner (sm, md, lg, xl)
 * @param {string} props.text - Loading text to display
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Loading spinner component
 */
const LoadingSpinner = ({
  size = "md",
  text = "Loading...",
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-4 ${className}`}
    >
      <MdRefresh className={`${sizeClasses[size]} animate-spin text-primary`} />
      {text && (
        <p className={`mt-2 text-base-content/70 ${textSizes[size]}`}>{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
