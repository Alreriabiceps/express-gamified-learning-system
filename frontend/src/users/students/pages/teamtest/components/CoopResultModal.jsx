import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaForward,
  FaBullseye,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";

const CoopResultModal = ({
  showResultModal,
  setShowResultModal,
  testResult,
  teamStats,
  loading,
  error,
}) => {
  const navigate = useNavigate();

  if (!showResultModal) return null;

  const handleBackToDashboard = () => {
    setShowResultModal(false);
    navigate("/student/dashboard");
  };

  const handleTakeAnotherTest = () => {
    setShowResultModal(false);
    navigate("/student/partymmr");
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.8)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#1a1a1a",
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "500px",
          width: "100%",
          maxHeight: "90vh",
          border: "1px solid #333",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "10px" }}>🏆</div>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#fff",
              margin: 0,
            }}
          >
            Team Test Complete!
          </h2>
          <p style={{ color: "#ccc", fontSize: "0.9rem", margin: "8px 0 0 0" }}>
            Great job working together!
          </p>
        </div>

        {loading && !testResult ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <div style={{ color: "#ccc", fontSize: "1rem" }}>
              Calculating results...
            </div>
          </div>
        ) : !loading && !testResult && error ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <h3
              style={{
                color: "#e74c3c",
                marginBottom: "10px",
                fontSize: "1.1rem",
              }}
            >
              Error
            </h3>
            <p
              style={{
                color: "#ccc",
                marginBottom: "20px",
                fontSize: "0.9rem",
              }}
            >
              {error}
            </p>
            <button
              onClick={() => setShowResultModal(false)}
              style={{
                background: "#4ade80",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              Close
            </button>
          </div>
        ) : testResult ? (
          <>
            {/* Team Score Display */}
            <div
              style={{
                textAlign: "center",
                marginBottom: "20px",
                padding: "16px",
                background: "#2a2a2a",
                borderRadius: "8px",
                border: "1px solid #333",
              }}
            >
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 700,
                  color: "#4ade80",
                  marginBottom: "4px",
                }}
              >
                {teamStats?.correct || 0}/{teamStats?.total || 0}
              </div>
              <div
                style={{
                  fontSize: "1rem",
                  color: "#ccc",
                }}
              >
                {Math.round(
                  ((teamStats?.correct || 0) / (teamStats?.total || 1)) * 100
                )}
                % Correct
              </div>
            </div>

            {/* Team Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  padding: "12px",
                  background: "#2a2a2a",
                  borderRadius: "6px",
                  border: "1px solid #333",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    color: "#4ade80",
                    fontSize: "1.2rem",
                    marginBottom: "4px",
                  }}
                >
                  <FaCheckCircle />
                </div>
                <div
                  style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600 }}
                >
                  {teamStats?.correct || 0}
                </div>
                <div style={{ color: "#ccc", fontSize: "0.8rem" }}>Correct</div>
              </div>
              <div
                style={{
                  padding: "12px",
                  background: "#2a2a2a",
                  borderRadius: "6px",
                  border: "1px solid #333",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    color: "#e74c3c",
                    fontSize: "1.2rem",
                    marginBottom: "4px",
                  }}
                >
                  <FaTimesCircle />
                </div>
                <div
                  style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600 }}
                >
                  {teamStats?.wrong || 0}
                </div>
                <div style={{ color: "#ccc", fontSize: "0.8rem" }}>Wrong</div>
              </div>
              <div
                style={{
                  padding: "12px",
                  background: "#2a2a2a",
                  borderRadius: "6px",
                  border: "1px solid #333",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    color: "#f39c12",
                    fontSize: "1.2rem",
                    marginBottom: "4px",
                  }}
                >
                  <FaForward />
                </div>
                <div
                  style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600 }}
                >
                  {teamStats?.skipped || 0}
                </div>
                <div style={{ color: "#ccc", fontSize: "0.8rem" }}>Skipped</div>
              </div>
              <div
                style={{
                  padding: "12px",
                  background: "#2a2a2a",
                  borderRadius: "6px",
                  border: "1px solid #333",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    color: "#9b59b6",
                    fontSize: "1.2rem",
                    marginBottom: "4px",
                  }}
                >
                  <FaBullseye />
                </div>
                <div
                  style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600 }}
                >
                  {Math.round(
                    ((teamStats?.correct || 0) / (teamStats?.total || 1)) * 100
                  )}
                  %
                </div>
                <div style={{ color: "#ccc", fontSize: "0.8rem" }}>
                  Accuracy
                </div>
              </div>
            </div>

            {/* Team Performance Message */}
            <div
              style={{
                padding: "16px",
                background: "#2a2a2a",
                borderRadius: "8px",
                border: "1px solid #333",
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#f1c40f",
                  fontSize: "1.5rem",
                  marginBottom: "8px",
                }}
              >
                <FaTrophy />
              </div>
              <div style={{ color: "#fff", fontSize: "1rem", fontWeight: 500 }}>
                {(() => {
                  const accuracy = Math.round(
                    ((teamStats?.correct || 0) / (teamStats?.total || 1)) * 100
                  );
                  if (accuracy >= 80) return "Excellent teamwork! 🌟";
                  if (accuracy >= 60) return "Good collaboration! 👍";
                  if (accuracy >= 40) return "Nice effort! 💪";
                  return "Keep practicing together! 📚";
                })()}
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
              }}
            >
              <button
                onClick={handleBackToDashboard}
                style={{
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  flex: 1,
                }}
              >
                Back to Dashboard
              </button>
              <button
                onClick={handleTakeAnotherTest}
                style={{
                  background: "#4ade80",
                  color: "white",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  flex: 1,
                }}
              >
                Take Another Test
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default CoopResultModal;
