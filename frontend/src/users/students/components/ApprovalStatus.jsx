import React, { useEffect } from "react";
import { safeToast } from "../../../utils/toastManager";

const ApprovalStatus = ({ isApproved, isActive }) => {
  // Clear any existing notifications when component mounts
  useEffect(() => {
    // Clear any existing notifications to start fresh
    safeToast.dismiss("account-pending");
    safeToast.dismiss("account-deactivated");
    safeToast.dismiss("account-approved");
  }, []);

  // Show notifications based on current status
  useEffect(() => {
    if (!isActive) {
      safeToast.error(
        "Your account has been deactivated. Please contact an administrator.",
        {
          toastId: "account-deactivated",
          autoClose: false,
          closeOnClick: false,
          draggable: false,
        }
      );
    } else if (!isApproved) {
      safeToast.warning(
        "Your account is pending admin approval. You can browse but cannot participate in activities.",
        {
          toastId: "account-pending",
          autoClose: false,
          closeOnClick: false,
          draggable: false,
        }
      );
    } else {
      // Clear any existing approval notifications when approved
      safeToast.dismiss("account-pending");
      safeToast.dismiss("account-deactivated");

      // Show success notification briefly
      safeToast.success(
        "Your account is fully approved! You can participate in all activities.",
        {
          toastId: "account-approved",
          autoClose: 5000,
        }
      );
    }
  }, [isApproved, isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up any toasts when component unmounts
      safeToast.dismiss("account-pending");
      safeToast.dismiss("account-deactivated");
      safeToast.dismiss("account-approved");
    };
  }, []);

  // Don't render persistent banners anymore
  return null;
};

export default ApprovalStatus;
