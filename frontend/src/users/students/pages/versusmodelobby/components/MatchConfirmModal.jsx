import React, { useState, useEffect, useRef } from "react";
import { FaClock, FaCheck, FaTimes } from "react-icons/fa";
import styles from "../pages/VersusModeLobby.module.css";

const MatchConfirmModal = ({
  isOpen,
  opponentName,
  lobbyId,
  onAccept,
  onDecline,
  timeout = 30, // 30 seconds default
  isWaitingForOpponent = false,
}) => {
  const [timeLeft, setTimeLeft] = useState(timeout);
  const [isAccepted, setIsAccepted] = useState(false);
  const [shouldDecline, setShouldDecline] = useState(false);
  const onDeclineRef = useRef(onDecline);

  // Update the ref when onDecline changes
  useEffect(() => {
    onDeclineRef.current = onDecline;
  }, [onDecline]);

  // Handle the decline action in a separate effect
  useEffect(() => {
    if (shouldDecline) {
      console.log("🔍 MatchConfirmModal - Auto-declining due to timeout");
      onDeclineRef.current();
      setShouldDecline(false);
    }
  }, [shouldDecline]);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(timeout);
      setIsAccepted(false);
      setShouldDecline(false);
      return;
    }

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-decline if time runs out
          setShouldDecline(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeout]);

  const handleAccept = () => {
    setIsAccepted(true);
    onAccept();
  };

  const handleDecline = () => {
    onDecline();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.confirmModal}>
        <div className={styles.confirmModalHeader}>
          <h2>
            <FaClock className={styles.timerIcon} />
            Match Found!
          </h2>
          <div className={styles.timerContainer}>
            <div className={styles.timerCircle}>
              <span className={styles.timerText}>{timeLeft}</span>
            </div>
          </div>
        </div>

        <div className={styles.confirmModalContent}>
          <div className={styles.opponentInfo}>
            <div className={styles.opponentAvatar}>
              <span>{opponentName?.charAt(0) || "?"}</span>
            </div>
            <div className={styles.opponentDetails}>
              <h3>Opponent Found</h3>
              <p className={styles.opponentName}>{opponentName}</p>
              <p className={styles.lobbyInfo}>Lobby: {lobbyId}</p>
            </div>
          </div>

          <div className={styles.confirmMessage}>
            {isWaitingForOpponent ? (
              <>
                <p>✅ You have accepted the match!</p>
                <p className={styles.timeWarning}>
                  Waiting for <strong>{opponentName}</strong> to accept...
                </p>
              </>
            ) : (
              <>
                <p>Do you want to accept this match?</p>
                <p className={styles.timeWarning}>
                  You have <strong>{timeLeft} seconds</strong> to respond
                </p>
              </>
            )}
          </div>
        </div>

        <div className={styles.confirmModalFooter}>
          <button
            className={`${styles.confirmButton} ${styles.declineButton}`}
            onClick={handleDecline}
            disabled={isAccepted || isWaitingForOpponent}
          >
            <FaTimes />
            Decline
          </button>
          <button
            className={`${styles.confirmButton} ${styles.acceptButton}`}
            onClick={handleAccept}
            disabled={isAccepted || isWaitingForOpponent}
          >
            <FaCheck />
            {isWaitingForOpponent ? "Accepted" : "Accept Match"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchConfirmModal;
