import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import styles from "./Login.module.css";
// Icons removed as requested
import FloatingStars from "../components/FloatingStars/FloatingStars";

// Old SVG Icons removed

const Login = () => {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      if (!backendUrl) {
        throw new Error(
          "Backend URL is not configured. Please check your environment variables."
        );
      }
      const response = await fetch(`${backendUrl}/api/auth/student-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: Number(studentId),
          password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ||
            `Login failed: ${response.status} ${response.statusText}`
        );
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.student));
      await login({ studentId, password });
      navigate("/start");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginPageWrapper}>
      <FloatingStars />

      {/* Top Navigation Bar - Simplified */}
      <nav className={styles.topNavBar}>
        <div className={styles.navBrand}>AGILA Adventure</div>
        <div className={styles.navActions}>
          {/* Icons removed as requested */}
        </div>
      </nav>

      {/* Central Login Panel */}
      <div className={styles.loginPanel}>
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <h1 className={styles.loginTitle}>Welcome, Adventurer!</h1>
          <div className={styles.inputGroup}>
            <label htmlFor="studentId">Your Adventurer Name</label>
            <input
              type="text"
              id="studentId"
              name="studentId"
              className={styles.inputField}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              autoComplete="username"
              disabled={isLoading}
              placeholder="e.g., StarJumper42"
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Secret Passcode</label>
            <input
              type="password"
              id="password"
              name="password"
              className={styles.inputField}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isLoading}
              placeholder="Enter your magic word"
            />
          </div>
          {error && (
            <p className={styles.errorMessage}>
              Oops!{" "}
              {error.includes("not configured")
                ? error
                : error.includes("Login failed") ||
                  error.includes("match our storybook")
                ? "That passcode doesn't match our storybook, or there was a login issue."
                : error}
            </p>
          )}
          <button
            type="submit"
            className={styles.loginButton}
            disabled={isLoading}
          >
            {isLoading ? "Opening the Book..." : "Start the Adventure"}
          </button>
        </form>
        <div className={styles.loginLinksWrapper}>
          <button
            type="button"
            className={styles.auxiliaryLink}
            onClick={() => navigate("/register")}
            disabled={isLoading}
          >
            Create your adventurer profile!
          </button>
          <button
            type="button"
            className={styles.auxiliaryLink}
            onClick={() => navigate("/forgot-password")}
            disabled={isLoading}
          >
            Forgot your magic word?
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
