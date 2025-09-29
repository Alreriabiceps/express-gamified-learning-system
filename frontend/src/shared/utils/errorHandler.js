/**
 * Centralized error handling utilities for admin pages
 */

/**
 * Handle API errors consistently
 * @param {Error|Response} error - The error object or response
 * @param {Function} setError - Function to set error state
 * @param {string} defaultMessage - Default error message
 * @returns {string} - Formatted error message
 */
export const handleApiError = (
  error,
  setError,
  defaultMessage = "An error occurred"
) => {
  let message = defaultMessage;

  if (error instanceof Response) {
    // Handle fetch Response errors
    if (error.status === 401) {
      message = "Unauthorized. Please log in again.";
    } else if (error.status === 403) {
      message = "Access denied. You don't have permission for this action.";
    } else if (error.status === 404) {
      message = "Resource not found.";
    } else if (error.status === 422) {
      message = "Validation error. Please check your input.";
    } else if (error.status >= 500) {
      message = "Server error. Please try again later.";
    } else {
      message = `Request failed with status ${error.status}`;
    }
  } else if (error && error.message) {
    // Handle Error objects
    message = error.message;
  } else if (typeof error === "string") {
    // Handle string errors
    message = error;
  }

  setError(message);
  return message;
};

/**
 * Handle form validation errors
 * @param {Object} errors - Validation errors object
 * @param {Function} setError - Function to set error state
 * @returns {boolean} - Whether there are validation errors
 */
export const handleValidationErrors = (errors, setError) => {
  if (!errors || Object.keys(errors).length === 0) {
    return false;
  }

  const errorMessages = Object.values(errors).filter(Boolean);
  if (errorMessages.length > 0) {
    setError(errorMessages.join(". "));
    return true;
  }

  return false;
};

/**
 * Clear error after a delay
 * @param {Function} setError - Function to clear error
 * @param {number} delay - Delay in milliseconds (default: 5000)
 */
export const clearErrorAfterDelay = (setError, delay = 5000) => {
  setTimeout(() => {
    setError("");
  }, delay);
};

/**
 * Handle network errors specifically
 * @param {Error} error - The error object
 * @param {Function} setError - Function to set error state
 */
export const handleNetworkError = (error, setError) => {
  if (error.name === "TypeError" && error.message.includes("fetch")) {
    setError("Network error. Please check your connection and try again.");
  } else {
    setError("An unexpected error occurred. Please try again.");
  }
};
