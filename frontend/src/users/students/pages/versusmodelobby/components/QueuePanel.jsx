import React from "react";
import { FaUsers, FaSyncAlt, FaTimes } from "react-icons/fa";
import styles from "../pages/VersusModeLobby.module.css";

// Function to format time (MM:SS)
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const QueuePanel = ({
  isQueueing,
  queueTime,
  handleQueueMatchmaking,
  handleCancelQueue,
  isLoadingAction,
}) => {
  return (
    <div className={`${styles.panel} ${styles.queuePanel}`}>
      <h3 className={styles.panelHeader}>
        <span className={styles.panelIcon}>
          <FaUsers />
        </span>
        Matchmaking
      </h3>
      <div className={styles.queuePanelContent}>
        {isQueueing ? (
          <div style={{ textAlign: "center" }}>
            <div className={styles.queueStatus}>
              <FaSyncAlt
                className={styles.spinning}
                style={{ marginRight: "8px" }}
              />
              Searching for opponent...
            </div>
            <div className={styles.queueTime}>{formatTime(queueTime)}</div>
            <button
              onClick={handleCancelQueue}
              className={`${styles.gameButton} ${styles.cancelQueueButton}`}
              disabled={isLoadingAction}
            >
              <FaTimes />
              Cancel Queue
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <p style={{ marginBottom: "20px", color: "var(--blueprint-text)" }}>
              Join the matchmaking queue to find an opponent quickly!
            </p>
            <button
              onClick={handleQueueMatchmaking}
              className={`${styles.gameButton} ${styles.queueButton}`}
              disabled={isLoadingAction}
            >
              <FaUsers />
              {isLoadingAction ? "Joining..." : "Quick Match"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueuePanel;
