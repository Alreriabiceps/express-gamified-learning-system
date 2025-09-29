import React, { useEffect, useState, useRef } from "react";
import { FaUsers, FaPlay, FaFistRaised } from "react-icons/fa";
import styles from "../pages/VersusModeLobby.module.css";

const MatchFoundModal = ({
  isOpen,
  player1Name,
  player2Name,
  lobbyId,
  onProceed,
}) => {
  const [countdown, setCountdown] = useState(5);
  const [shouldProceed, setShouldProceed] = useState(false);
  const onProceedRef = useRef(onProceed);

  // Update the ref when onProceed changes
  useEffect(() => {
    onProceedRef.current = onProceed;
  }, [onProceed]);

  console.log("🔍 MatchFoundModal render:", {
    isOpen,
    player1Name,
    player2Name,
    lobbyId,
  });

  // Handle the proceed action in a separate effect
  useEffect(() => {
    if (shouldProceed) {
      console.log("🔍 MatchFoundModal - Proceeding to game");
      onProceedRef.current();
      setShouldProceed(false);
    }
  }, [shouldProceed]);

  useEffect(() => {
    console.log("🔍 MatchFoundModal useEffect - isOpen:", isOpen);
    if (isOpen) {
      setCountdown(5);
      setShouldProceed(false);
      console.log("🔍 MatchFoundModal - Starting 5-second countdown");

      // Countdown timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            console.log(
              "🔍 MatchFoundModal - Countdown finished, setting shouldProceed"
            );
            setShouldProceed(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        console.log("🔍 MatchFoundModal - Cleaning up timer");
        clearInterval(timer);
      };
    }
  }, [isOpen]);

  if (!isOpen) {
    console.log("🔍 MatchFoundModal - Not open, returning null");
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.vsModal}>
        <div className={styles.vsModalHeader}>
          <h2>
            <FaFistRaised className={styles.vsIcon} />
            Battle Ready!
          </h2>
        </div>

        <div className={styles.vsModalContent}>
          <div className={styles.vsContainer}>
            {/* Player 1 */}
            <div className={styles.playerCard}>
              <div className={styles.playerAvatar}>
                <span>{player1Name?.charAt(0) || "P"}</span>
              </div>
              <div className={styles.playerInfo}>
                <h3 className={styles.playerName}>{player1Name}</h3>
                <div className={styles.playerBadge}>Player 1</div>
              </div>
            </div>

            {/* VS Section */}
            <div className={styles.vsSection}>
              <div className={styles.vsCircle}>
                <span className={styles.vsText}>VS</span>
              </div>
              <div className={styles.countdownContainer}>
                <div className={styles.countdownCircle}>
                  <span className={styles.countdownText}>{countdown}</span>
                </div>
                <p className={styles.countdownLabel}>Starting in</p>
              </div>
            </div>

            {/* Player 2 */}
            <div className={styles.playerCard}>
              <div className={styles.playerAvatar}>
                <span>{player2Name?.charAt(0) || "P"}</span>
              </div>
              <div className={styles.playerInfo}>
                <h3 className={styles.playerName}>{player2Name}</h3>
                <div className={styles.playerBadge}>Player 2</div>
              </div>
            </div>
          </div>

          <div className={styles.battleInfo}>
            <p className={styles.battleMessage}>Prepare for an epic battle!</p>
            <p className={styles.lobbyInfo}>Lobby: {lobbyId}</p>
          </div>
        </div>

        <div className={styles.vsModalFooter}>
          <div className={styles.autoJoinMessage}>
            <FaPlay />
            Joining battle automatically...
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchFoundModal;
