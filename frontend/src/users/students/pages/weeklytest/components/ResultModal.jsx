import React from "react";
import styles from "../pages/WeeklyTest.module.css";

const ResultModal = ({
  showResultModal,
  setShowResultModal,
  testResult,
  score,
  pointsEarned,
  loading,
  error,
}) => {
  if (!showResultModal) return null;

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
          maxWidth: "400px",
          width: "100%",
          maxHeight: "90vh",
          border: "1px solid #333",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#fff",
              margin: 0,
            }}
          >
            Test Complete
          </h2>
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
            {/* Compact Score Display */}
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
                {score}/{testResult.totalQuestions}
              </div>
              <div
                style={{
                  fontSize: "1rem",
                  color: "#ccc",
                }}
              >
                {Math.round((score / testResult.totalQuestions) * 100)}% Correct
              </div>
            </div>

            {/* Compact Stats */}
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
                    fontSize: "0.8rem",
                    color: "#999",
                    marginBottom: "4px",
                  }}
                >
                  Points
                </div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: pointsEarned >= 0 ? "#4ade80" : "#e74c3c",
                  }}
                >
                  {pointsEarned > 0 ? "+" : ""}
                  {pointsEarned}
                </div>
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
                    fontSize: "0.8rem",
                    color: "#999",
                    marginBottom: "4px",
                  }}
                >
                  Total Score
                </div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#4ade80",
                  }}
                >
                  {score}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowResultModal(false)}
              style={{
                width: "100%",
                background: "#4ade80",
                color: "white",
                border: "none",
                padding: "10px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: 500,
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#22c55e";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#4ade80";
              }}
            >
              Close
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p style={{ color: "#ccc", fontSize: "0.9rem" }}>
              No results to display.
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
                marginTop: "10px",
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultModal;
