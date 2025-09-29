import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="max-w-md w-full p-8 bg-base-100 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold text-error mb-4">Access Denied</h1>
        <p className="text-base-content/70 mb-6">
          You don't have permission to access this page.
          asdasdsadsadasadasdasdasd
        </p>
        <div className="space-y-4">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-primary w-full"
          >
            Go Back
          </button>
          <button onClick={handleLogout} className="btn btn-outline w-full">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
