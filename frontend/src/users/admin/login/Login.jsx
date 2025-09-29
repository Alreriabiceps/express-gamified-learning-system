import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import {
  MdPerson,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdAdminPanelSettings,
  MdLogin,
  MdSecurity,
} from "react-icons/md";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const backendUrl =
        import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      console.log("Attempting login with:", { username, password, backendUrl });

      const response = await fetch(`${backendUrl}/api/auth/admin-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include", // Add this for proper cookie handling
      });

      console.log("Login response status:", response.status);
      const data = await response.json();
      console.log("Login response data:", data);

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store token and user data
      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({ role: "admin", ...data.admin })
      );

      // Update auth context
      await login({ username, password });

      // Navigate to dashboard
      navigate("/admin/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.message || "Failed to login. Please check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-base-200 to-secondary/10 flex items-center justify-center px-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, currentColor 2px, transparent 0)`,
            backgroundSize: "50px 50px",
          }}
        ></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Main Login Card */}
        <div className="bg-base-100 rounded-2xl shadow-2xl p-8 space-y-8 border border-base-300">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-gradient-to-br from-primary to-secondary p-4 rounded-2xl shadow-lg">
                <MdAdminPanelSettings className="w-12 h-12 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-base-content">
                Admin Portal
              </h1>
              <p className="text-base-content/70 mt-2">
                Sign in to access your dashboard
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error shadow-lg">
              <div className="flex items-center space-x-2">
                <MdSecurity className="w-5 h-5" />
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="form-control">
              <label className="label" htmlFor="username">
                <span className="label-text font-semibold flex items-center gap-2">
                  <MdPerson className="w-4 h-4" />
                  Username
                </span>
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  className="input input-bordered w-full pl-12 bg-base-50 border-base-300 focus:border-primary focus:outline-none transition-colors"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
                <MdPerson className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-control">
              <label className="label" htmlFor="password">
                <span className="label-text font-semibold flex items-center gap-2">
                  <MdLock className="w-4 h-4" />
                  Password
                </span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="input input-bordered w-full pl-12 pr-12 bg-base-50 border-base-300 focus:border-primary focus:outline-none transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <MdLock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <MdVisibilityOff className="w-5 h-5" />
                  ) : (
                    <MdVisibility className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:loading"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Signing In...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <MdLogin className="w-5 h-5" />
                  <span>Sign In</span>
                </div>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-base-content/50">
              Secured by GLEAS Admin Portal
            </p>
          </div>
        </div>

        {/* Additional Security Badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 bg-success/10 text-success px-4 py-2 rounded-full border border-success/20">
            <MdSecurity className="w-4 h-4" />
            <span className="text-sm font-medium">Secure Admin Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
