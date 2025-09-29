import React from "react";
import styles from "../pages/VersusModeLobby.module.css";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";

const JoinLobbyModal = ({
  isOpen,
  onClose,
  onSubmit,
  lobby,
  isLoading,
  error,
}) => {
  if (!isOpen) return null;

  const getLobbyStatus = () => {
    if (!lobby) return "";
    if (lobby.status !== "waiting") return "Game in progress";
    if (lobby.players.length >= lobby.maxPlayers) return "Lobby full";
    return "Waiting for players";
  };

  const getTimeRemaining = () => {
    if (!lobby?.expiresAt) return "";
    const timeRemaining = Math.max(
      0,
      Math.floor((new Date(lobby.expiresAt) - new Date()) / 1000)
    );
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    return `Expires in: ${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modal} ${styles.joinModal}`}>
        <div className={styles.modalHeader}>
          <h2>Join Lobby: {lobby?.name}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.lobbyInfo}>
            <div className={styles.lobbyDetail}>
              <span className={styles.detailLabel}>Host:</span>
              <span className={styles.detailValue}>
                {lobby?.hostId?.firstName} {lobby?.hostId?.lastName}
              </span>
            </div>
            <div className={styles.lobbyDetail}>
              <span className={styles.detailLabel}>Status:</span>
              <span className={styles.detailValue}>{getLobbyStatus()}</span>
            </div>
            <div className={styles.lobbyDetail}>
              <span className={styles.detailLabel}>Players:</span>
              <span className={styles.detailValue}>
                {lobby?.players?.length || 0}/{lobby?.maxPlayers}
              </span>
            </div>
            {!lobby?.isPrivate && lobby?.expiresAt && (
              <div className={styles.lobbyDetail}>
                <span className={styles.detailLabel}>Time Remaining:</span>
                <span className={styles.detailValue}>{getTimeRemaining()}</span>
              </div>
            )}
            {lobby?.isPrivate && (
              <div className={styles.formGroup}>
                <label
                  htmlFor="lobby-password"
                  className={styles.passwordLabel}
                >
                  Password Required
                </label>
                <input
                  id="lobby-password"
                  type="password"
                  placeholder="Enter lobby password"
                  className={styles.modalInput}
                  onChange={(e) => onSubmit(e.target.value)}
                  autoComplete="off"
                />
              </div>
            )}
          </div>
          {error && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>
                <FaExclamationTriangle />
              </span>
              <p>{error}</p>
            </div>
          )}
        </div>
        <div className={styles.modalFooter}>
          <button
            className={`${styles.gameButton} ${styles.cancelButton}`}
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          {!lobby?.isPrivate && (
            <button
              className={`${styles.gameButton} ${styles.submitButton}`}
              onClick={() => onSubmit("")}
              disabled={
                isLoading ||
                lobby?.players?.length >= lobby?.maxPlayers ||
                lobby?.status !== "waiting"
              }
            >
              {isLoading ? "Joining..." : "Join Lobby"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinLobbyModal;
