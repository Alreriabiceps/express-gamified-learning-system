// Toast Error Boundary
// Catches and handles React Toastify errors gracefully

import React from "react";

class ToastErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if this is a toast-related error
    const isToastError =
      error?.message?.includes("props") ||
      error?.stack?.includes("react-toastify") ||
      error?.stack?.includes("deleteToast");

    if (isToastError) {
      console.warn("Toast error caught by boundary:", error);
      return { hasError: true, error };
    }

    // Re-throw non-toast errors
    throw error;
  }

  componentDidCatch(error, errorInfo) {
    // Log toast errors but don't crash the app
    if (this.state.hasError) {
      console.warn("Toast error boundary caught error:", error, errorInfo);

      // Reset the error state after a short delay
      setTimeout(() => {
        this.setState({ hasError: false, error: null });
      }, 1000);
    }
  }

  render() {
    if (this.state.hasError) {
      // Don't render anything for toast errors - let the app continue
      return null;
    }

    return this.props.children;
  }
}

export default ToastErrorBoundary;
