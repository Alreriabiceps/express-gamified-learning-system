import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Signup.module.css";
import { FaEnvelope } from "react-icons/fa";
import FloatingStars from "../components/FloatingStars/FloatingStars";

const Signup = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    studentId: "",
    password: "",
    confirmPassword: "",
    track: "",
    section: "",
    yearLevel: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });
  const navigate = useNavigate();

  const checkPasswordStrength = (password) => {
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[@$!%*?&]/.test(password),
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "password") {
      checkPasswordStrength(value);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: name === "studentId" ? value.replace(/\D/, "") : value,
    }));
  };

  const validatePassword = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    // Check individual requirements
    const strengthValues = Object.values(passwordStrength);
    if (strengthValues.some((val) => val === false)) {
      setError("Password does not meet all requirements");
      return false;
    }

    // Additional validation to match backend regex exactly
    const backendPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!backendPasswordRegex.test(formData.password)) {
      setError(
        "Password must contain only letters, numbers, and these special characters: @$!%*?&"
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      if (!backendUrl) {
        throw new Error(
          "Backend URL is not configured. Please check your environment variables."
        );
      }

      const response = await fetch(`${backendUrl}/api/auth/student-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          studentId: Number(formData.studentId),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Registration failed: ${response.status} ${response.statusText}`
        );
      }

      setSuccess("Registration successful! You can now log in.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.signupPageWrapper}>
      <FloatingStars />
      <div className={styles.signupPanel}>
        <h1 className={styles.pageTitle}>Create New Account</h1>

        {success ? (
          <div>
            <div className={styles.successMessagePanel}>
              <FaEnvelope className={styles.successIcon} />
              <div>
                <h2 className={styles.successTitle}>Registration Complete!</h2>
                <p className={styles.successText}>
                  Your account has been created successfully.
                  <br />
                  <span>You can now log in with your credentials.</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              className={`${styles.signupButton} ${styles.backToLoginButton}`}
              style={{ marginTop: "2rem" }}
              onClick={() => navigate("/")}
            >
              Back to Log In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.signupFormGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="firstName">First Name:</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  className={styles.inputField}
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  placeholder="First Name"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="middleName">Middle Name:</label>
                <input
                  type="text"
                  id="middleName"
                  name="middleName"
                  className={styles.inputField}
                  value={formData.middleName}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="Middle Name (optional)"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="lastName">Last Name:</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  className={styles.inputField}
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  placeholder="Last Name"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={styles.inputField}
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  placeholder="Email"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="studentId">Service ID:</label>
                <input
                  type="text"
                  id="studentId"
                  name="studentId"
                  className={styles.inputField}
                  value={formData.studentId}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  disabled={isLoading}
                  placeholder="e.g., 12345"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="track">Track:</label>
                <select
                  id="track"
                  name="track"
                  className={styles.selectField}
                  value={formData.track}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                >
                  <option value="">Select Track</option>
                  <option value="Academic Track">Academic Track</option>
                  <option value="Technical-Professional Track">
                    Technical-Professional Track
                  </option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="section">Section:</label>
                <input
                  type="text"
                  id="section"
                  name="section"
                  className={styles.inputField}
                  value={formData.section}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  placeholder="Section"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="yearLevel">Year Level:</label>
                <select
                  id="yearLevel"
                  name="yearLevel"
                  className={styles.selectField}
                  value={formData.yearLevel}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                >
                  <option value="">Select Year Level</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>

              <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                <label htmlFor="password">Password Matrix:</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className={styles.inputField}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                  placeholder="••••••••"
                  minLength={8}
                />
                <div className={styles.passwordRequirements}>
                  <p>Password must contain:</p>
                  <ul>
                    {Object.entries(passwordStrength).map(([key, met]) => (
                      <li
                        key={key}
                        className={
                          met ? styles.requirementMet : styles.requirementNotMet
                        }
                      >
                        {key === "length" && "At least 8 characters"}
                        {key === "uppercase" && "One uppercase letter"}
                        {key === "lowercase" && "One lowercase letter"}
                        {key === "number" && "One number"}
                        {key === "special" && "One special character (@$!%*?&)"}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                <label htmlFor="confirmPassword">
                  Confirm Password Matrix:
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className={styles.inputField}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                  placeholder="••••••••"
                  minLength={8}
                />
              </div>
            </div>

            {error && (
              <p className={`${styles.messageBox} ${styles.errorMessage}`}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className={styles.signupButton}
              disabled={isLoading}
            >
              {isLoading ? "REGISTERING..." : "SIGN UP"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Signup;
