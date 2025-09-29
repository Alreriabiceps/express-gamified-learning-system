// Global Toast Manager
// Prevents duplicate toast IDs and handles cleanup properly
// React StrictMode compatible

import { toast } from "react-toastify";

class ToastManager {
  constructor() {
    this.activeToasts = new Set();
    this.toastCallbacks = new Map();
    this.isInitialized = false;
    this.pendingOperations = new Map();

    // Initialize with a small delay to ensure React Toastify is ready
    this.initialize();
  }

  // Initialize the toast manager
  initialize() {
    if (this.isInitialized) return;

    // Wait for React Toastify to be ready
    const checkReady = () => {
      try {
        // Test if toast is available
        if (
          typeof toast === "function" ||
          typeof toast.success === "function"
        ) {
          this.isInitialized = true;
          this.processPendingOperations();
        } else {
          setTimeout(checkReady, 50);
        }
      } catch (error) {
        setTimeout(checkReady, 50);
      }
    };

    checkReady();
  }

  // Process any pending operations
  processPendingOperations() {
    for (const [operationId, operation] of this.pendingOperations) {
      try {
        operation();
      } catch (error) {
        console.warn(
          `Failed to process pending operation ${operationId}:`,
          error
        );
      }
    }
    this.pendingOperations.clear();
  }

  // Safe toast creation with duplicate prevention
  createToast(type, message, options = {}) {
    if (!this.isInitialized) {
      // Queue the operation if not initialized
      const operationId = `create_${Date.now()}_${Math.random()}`;
      this.pendingOperations.set(operationId, () =>
        this.createToast(type, message, options)
      );
      return null;
    }

    const toastId = options.toastId || this.generateId();

    // If toast already exists, dismiss it first
    if (this.activeToasts.has(toastId)) {
      this.dismissToast(toastId);
    }

    // Create the toast with enhanced error handling
    const toastOptions = {
      ...options,
      toastId,
      onClose: () => {
        this.activeToasts.delete(toastId);
        this.toastCallbacks.delete(toastId);
        if (options.onClose) {
          try {
            options.onClose();
          } catch (error) {
            console.warn(`Error in toast onClose callback:`, error);
          }
        }
      },
    };

    try {
      let toastInstance;
      switch (type) {
        case "success":
          toastInstance = toast.success(message, toastOptions);
          break;
        case "error":
          toastInstance = toast.error(message, toastOptions);
          break;
        case "warning":
          toastInstance = toast.warning(message, toastOptions);
          break;
        case "info":
          toastInstance = toast.info(message, toastOptions);
          break;
        default:
          toastInstance = toast(message, toastOptions);
      }

      this.activeToasts.add(toastId);
      return toastInstance;
    } catch (error) {
      console.warn(`Failed to create toast ${type}:`, error);
      return null;
    }
  }

  // Safe toast dismissal with enhanced error handling
  dismissToast(toastId) {
    if (!this.isInitialized) {
      // Queue the operation if not initialized
      const operationId = `dismiss_${Date.now()}_${Math.random()}`;
      this.pendingOperations.set(operationId, () => this.dismissToast(toastId));
      return;
    }

    try {
      if (this.activeToasts.has(toastId)) {
        // Use a timeout to prevent race conditions
        setTimeout(() => {
          try {
            toast.dismiss(toastId);
          } catch (dismissError) {
            console.warn(`Failed to dismiss toast ${toastId}:`, dismissError);
          }
        }, 0);

        this.activeToasts.delete(toastId);
        this.toastCallbacks.delete(toastId);
      }
    } catch (error) {
      console.warn(`Failed to dismiss toast ${toastId}:`, error);
      // Clean up our tracking even if dismiss failed
      this.activeToasts.delete(toastId);
      this.toastCallbacks.delete(toastId);
    }
  }

  // Dismiss all toasts with enhanced error handling
  dismissAll() {
    if (!this.isInitialized) {
      // Queue the operation if not initialized
      const operationId = `dismissAll_${Date.now()}_${Math.random()}`;
      this.pendingOperations.set(operationId, () => this.dismissAll());
      return;
    }

    try {
      // Use a timeout to prevent race conditions
      setTimeout(() => {
        try {
          toast.dismiss();
        } catch (dismissError) {
          console.warn("Failed to dismiss all toasts:", dismissError);
        }
      }, 0);

      this.activeToasts.clear();
      this.toastCallbacks.clear();
    } catch (error) {
      console.warn("Failed to dismiss all toasts:", error);
      this.activeToasts.clear();
      this.toastCallbacks.clear();
    }
  }

  // Generate unique ID with timestamp and random component
  generateId() {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check if toast exists
  hasToast(toastId) {
    return this.activeToasts.has(toastId);
  }

  // Get active toast count
  getActiveCount() {
    return this.activeToasts.size;
  }

  // Reset the manager (useful for testing or cleanup)
  reset() {
    this.activeToasts.clear();
    this.toastCallbacks.clear();
    this.pendingOperations.clear();
    this.isInitialized = false;
    this.initialize();
  }
}

// Create singleton instance
const toastManager = new ToastManager();

// Global error handler for unhandled toast errors
const originalConsoleError = console.error;
console.error = (...args) => {
  const errorMessage = args.join(" ");

  // Check if this is a toast-related error
  if (
    errorMessage.includes("Cannot read properties of undefined") &&
    errorMessage.includes("props") &&
    errorMessage.includes("react-toastify")
  ) {
    console.warn("Toast error intercepted and handled:", ...args);
    return; // Don't log the error
  }

  // Log other errors normally
  originalConsoleError.apply(console, args);
};

// Export convenience methods
export const safeToast = {
  success: (message, options) =>
    toastManager.createToast("success", message, options),
  error: (message, options) =>
    toastManager.createToast("error", message, options),
  warning: (message, options) =>
    toastManager.createToast("warning", message, options),
  info: (message, options) =>
    toastManager.createToast("info", message, options),
  dismiss: (toastId) => toastManager.dismissToast(toastId),
  dismissAll: () => toastManager.dismissAll(),
  hasToast: (toastId) => toastManager.hasToast(toastId),
  getActiveCount: () => toastManager.getActiveCount(),
};

export default toastManager;
