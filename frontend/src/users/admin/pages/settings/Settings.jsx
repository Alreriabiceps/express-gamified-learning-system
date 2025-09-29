import React, { useState } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { MdLock, MdPerson, MdSave } from "react-icons/md";
import { useGuideMode } from "../../../../contexts/GuideModeContext";

const Settings = () => {
  // Remove unused user variable
  // const { user } = useAuth();
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    newUsername: "",
  });
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    role: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("security");
  const { guideMode } = useGuideMode();

  const handleSecurityChange = (e) => {
    const { name, value } = e.target;
    setSecurityForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setError("New passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Change password
      if (securityForm.newPassword) {
        const passwordResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/auth/change-password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              currentPassword: securityForm.currentPassword,
              newPassword: securityForm.newPassword,
            }),
          }
        );

        if (!passwordResponse.ok) {
          const data = await passwordResponse.json();
          throw new Error(data.error || "Failed to change password");
        }
      }

      // Change username
      if (securityForm.newUsername) {
        const usernameResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/auth/change-username`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              currentPassword: securityForm.currentPassword,
              newUsername: securityForm.newUsername,
            }),
          }
        );

        if (!usernameResponse.ok) {
          const data = await usernameResponse.json();
          throw new Error(data.error || "Failed to change username");
        }
      }

      setSuccess("Security settings updated successfully");
      setSecurityForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        newUsername: "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/update-profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(profileForm),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-base-200 rounded-lg shadow-lg p-3 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-primary">Settings</h1>
            <div className="text-sm text-base-content/70">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>

          {guideMode && (
            <details
              open
              className="mb-6 bg-warning/10 border border-warning rounded p-3"
            >
              <summary className="cursor-pointer font-medium text-base text-warning mb-1">
                How to use the Settings page?
              </summary>
              <ol className="mt-2 text-sm text-base-content list-decimal list-inside space-y-1">
                <li>
                  Switch between Security and Profile tabs to update your
                  information.
                </li>
                <li>In Security, you can change your password and username.</li>
                <li>In Profile, you can update your name, email, and role.</li>
                <li>
                  Click <b>Save</b> to apply your changes. A confirmation will
                  appear if successful.
                </li>
              </ol>
            </details>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="md:col-span-1">
              <div className="card bg-base-100 p-4 rounded-lg">
                <ul className="menu menu-sm">
                  <li className="menu-title">
                    <span>Account</span>
                  </li>
                  <li>
                    <a
                      className={activeTab === "security" ? "active" : ""}
                      onClick={() => setActiveTab("security")}
                    >
                      <MdLock className="w-4 h-4" />
                      Security
                    </a>
                  </li>
                  <li>
                    <a
                      className={activeTab === "profile" ? "active" : ""}
                      onClick={() => setActiveTab("profile")}
                    >
                      <MdPerson className="w-4 h-4" />
                      Profile
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Main Settings Area */}
            <div className="md:col-span-3">
              <div className="card bg-base-100 p-4 rounded-lg">
                {activeTab === "security" && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <MdLock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="card-title text-lg">
                          Security Settings
                        </h2>
                        <p className="text-sm text-base-content/70">
                          Update your password and username
                        </p>
                      </div>
                    </div>

                    <form
                      onSubmit={handleSecuritySubmit}
                      className="space-y-4 max-w-md"
                    >
                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text font-medium">
                            Current Password
                          </span>
                        </label>
                        <input
                          type="password"
                          name="currentPassword"
                          value={securityForm.currentPassword}
                          onChange={handleSecurityChange}
                          className="input input-bordered input-sm w-full bg-base-100"
                          required
                          placeholder="Enter your current password"
                        />
                      </div>

                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text font-medium">
                            New Username
                          </span>
                        </label>
                        <input
                          type="text"
                          name="newUsername"
                          value={securityForm.newUsername}
                          onChange={handleSecurityChange}
                          className="input input-bordered input-sm w-full bg-base-100"
                          minLength={3}
                          placeholder="Enter your new username"
                        />
                        <label className="label py-1">
                          <span className="label-text-alt text-xs">
                            Username must be at least 3 characters long
                          </span>
                        </label>
                      </div>

                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text font-medium">
                            New Password
                          </span>
                        </label>
                        <input
                          type="password"
                          name="newPassword"
                          value={securityForm.newPassword}
                          onChange={handleSecurityChange}
                          className="input input-bordered input-sm w-full bg-base-100"
                          minLength={6}
                          placeholder="Enter your new password"
                        />
                        <label className="label py-1">
                          <span className="label-text-alt text-xs">
                            Password must be at least 6 characters long
                          </span>
                        </label>
                      </div>

                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text font-medium">
                            Confirm New Password
                          </span>
                        </label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={securityForm.confirmPassword}
                          onChange={handleSecurityChange}
                          className="input input-bordered input-sm w-full bg-base-100"
                          minLength={6}
                          placeholder="Confirm your new password"
                        />
                      </div>

                      {error && (
                        <div className="alert alert-error alert-sm">
                          <span>{error}</span>
                        </div>
                      )}

                      {success && (
                        <div className="alert alert-success alert-sm">
                          <span>{success}</span>
                        </div>
                      )}

                      <div className="form-control mt-4">
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm gap-2"
                          disabled={isLoading}
                        >
                          <MdSave className="w-4 h-4" />
                          {isLoading ? "Saving Changes..." : "Save Changes"}
                        </button>
                      </div>
                    </form>
                  </>
                )}

                {activeTab === "profile" && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <MdPerson className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="card-title text-lg">Profile Settings</h2>
                        <p className="text-sm text-base-content/70">
                          Update your profile information
                        </p>
                      </div>
                    </div>

                    <form
                      onSubmit={handleProfileSubmit}
                      className="space-y-4 max-w-md"
                    >
                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text font-medium">Name</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={profileForm.name}
                          onChange={handleProfileChange}
                          className="input input-bordered input-sm w-full bg-base-100"
                          required
                          placeholder="Enter your name"
                        />
                      </div>

                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text font-medium">Email</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={profileForm.email}
                          onChange={handleProfileChange}
                          className="input input-bordered input-sm w-full bg-base-100"
                          required
                          placeholder="Enter your email"
                        />
                      </div>

                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text font-medium">Role</span>
                        </label>
                        <select
                          name="role"
                          value={profileForm.role}
                          onChange={handleProfileChange}
                          className="select select-bordered select-sm w-full bg-base-100"
                          required
                        >
                          <option value="">Select Role</option>
                          <option value="admin">Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </select>
                      </div>

                      {error && (
                        <div className="alert alert-error alert-sm">
                          <span>{error}</span>
                        </div>
                      )}

                      {success && (
                        <div className="alert alert-success alert-sm">
                          <span>{success}</span>
                        </div>
                      )}

                      <div className="form-control mt-4">
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm gap-2"
                          disabled={isLoading}
                        >
                          <MdSave className="w-4 h-4" />
                          {isLoading ? "Saving Changes..." : "Save Changes"}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
