import React from "react";
import {
  FaUserFriends,
  FaUsers,
  FaSyncAlt,
  FaExclamationTriangle,
  FaRedo,
} from "react-icons/fa";
import styles from "../pages/VersusModeLobby.module.css";

// Function to format time (MM:SS)
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const VersusLobbyHeader = ({
  wsConnected,
  activePlayersCount,
  isQueueing,
  queueTime,
  error,
  setError,
  onRetry,
}) => {
  return (
    <>
      {/* Header Section */}
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.pageTitle}>
            <FaUserFriends className={styles.titleIcon} />
            Battle Arena
          </h1>
          <p className={styles.pageSubtitle}>
            Challenge friends or find worthy opponents in epic duels
          </p>
        </div>

        <div className={styles.statusSection}>
          <div className={styles.connectionIndicator}>
            <div
              className={`${styles.statusDot} ${
                wsConnected ? styles.connected : styles.disconnected
              }`}
            ></div>
            <span className={styles.statusText}>
              {wsConnected ? "Connected" : "Offline"}
            </span>
          </div>
          <div className={styles.quickStats}>
            <div className={styles.statBadge}>
              <FaUsers />
              <span>{activePlayersCount} Players Online</span>
            </div>
            {isQueueing && (
              <div className={styles.statBadge}>
                <FaSyncAlt className={styles.spinning} />
                <span>In Queue: {formatTime(queueTime)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className={styles.errorBanner}>
          <FaExclamationTriangle className={styles.errorIcon} />
          <div className={styles.errorContent}>
            <p>{error}</p>
          </div>
          <button onClick={() => setError(null)} className={styles.errorClose}>
            <FaExclamationTriangle />
          </button>
        </div>
      )}

      {/* Connection Warning */}
      {!wsConnected && (
        <div className={styles.warningBanner}>
          <FaExclamationTriangle className={styles.warningIcon} />
          <div className={styles.warningContent}>
            <h4>Connection Issue</h4>
            <p>
              Unable to connect to game server. Some features may be limited.
            </p>
          </div>
          <button className={styles.retryButton} onClick={onRetry}>
            <FaRedo />
            Retry
          </button>
        </div>
      )}
    </>
  );
};

export default VersusLobbyHeader;
