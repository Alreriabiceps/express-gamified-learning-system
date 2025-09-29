import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "../signup/Signup.module.css";
import { FaCheckCircle, FaSpinner } from "react-icons/fa";

const RegistrationSuccess = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("pending");
  const hasProcessed = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      return;
    }

    // Prevent duplicate requests
    if (hasProcessed.current) {
      console.log("Frontend: Request already processed, skipping...");
      return;
    }

    async function fetchFinalize(tokenToFinalize) {
      hasProcessed.current = true;
      setStatus("pending");
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        if (!backendUrl) {
          throw new Error("Backend URL not configured.");
        }
        console.log(
          "Frontend: Calling finalize-registration with token:",
          tokenToFinalize
        );
        const res = await fetch(
          `${backendUrl}/api/auth/finalize-registration?token=${tokenToFinalize}`
        );
        console.log("Frontend: Response status:", res.status);
        console.log("Frontend: Response ok:", res.ok);

        if (!res.ok) {
          let errorMsg = "Failed to finalize registration.";
          try {
            const data = await res.json();
            console.log("Frontend: Error response data:", data);
            errorMsg = data.error || errorMsg;
          } catch (e) {
            console.error("Frontend: Could not parse error JSON:", e);
          }
          throw new Error(errorMsg);
        }

        // Parse the successful response
        const data = await res.json();
        console.log("Frontend: Success response data:", data);
        setStatus("success");
      } catch (err) {
        console.error("Frontend: Finalization error:", err);
        setStatus("error");
      }
    }

    fetchFinalize(token);
  }, [searchParams]);

  if (status === "pending") {
    return (
      <div className={styles.signupPageWrapper}>
        <div
          className={`${styles.signupPanel} ${styles.centeredTextContent}`}
          style={{ maxWidth: "450px" }}
        >
          <FaSpinner
            className={`${styles.successIcon} spin`}
            style={{ fontSize: "2.5rem", marginBottom: "1rem" }}
          />
          <h2 className={styles.successTitle}>
            Finalizing your registration...
          </h2>
          <p className={styles.successText}>Please wait a moment.</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={styles.signupPageWrapper}>
        <div
          className={`${styles.signupPanel} ${styles.centeredTextContent}`}
          style={{ maxWidth: "450px" }}
        >
          <h2
            className={styles.successTitle}
            style={{ color: "var(--blueprint-danger)" }}
          >
            Registration Error
          </h2>
          <p className={styles.successText}>
            There was a problem finalizing your registration. This could be due
            to an invalid or expired link. Please try registering again or
            contact support if the issue persists.
          </p>
          <button
            className={styles.signupButton}
            onClick={() => navigate("/register")}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.signupPageWrapper}>
      <div
        className={`${styles.signupPanel} ${styles.centeredTextContent}`}
        style={{ maxWidth: "450px" }}
      >
        <FaCheckCircle className={styles.successIcon} />
        <h2 className={styles.successTitle}>Registration Complete!</h2>
        <p className={styles.successText}>
          Thank you for joining GLEAS!
          <br />
          Your account is now ready. You can log in and start learning.
        </p>
        <button className={styles.signupButton} onClick={() => navigate("/")}>
          Log In
        </button>
      </div>
    </div>
  );
};

export default RegistrationSuccess;
