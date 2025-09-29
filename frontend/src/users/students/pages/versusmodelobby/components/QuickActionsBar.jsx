import React from "react";
import { FaPlus, FaUsers, FaTimes } from "react-icons/fa";
import styles from "../pages/VersusModeLobby.module.css";

const QuickActionsBar = ({
  hasActiveLobby,
  isLoadingAction,
  isQueueing,
  onCreateLobby,
  onToggleQueue,
}) => {
  return (
    <div className={styles.quickActionsContainer}>
      <div className={styles.quickActions}>
        <div className={styles.primaryActions}>
          <button
            className={`${styles.actionCard} ${styles.createBtn}`}
            onClick={onCreateLobby}
            disabled={hasActiveLobby || isLoadingAction}
          >
            <div className={styles.actionIcon}>
              <FaPlus />
            </div>
            <div className={styles.actionContent}>
              <h3>Create Lobby</h3>
              <p>Start your own room</p>
            </div>
          </button>

          <button
            className={`${styles.actionCard} ${styles.queueBtn} ${
              isQueueing ? styles.active : ""
            }`}
            onClick={onToggleQueue}
            disabled={isLoadingAction}
          >
            <div className={styles.actionIcon}>
              {isQueueing ? <FaTimes /> : <FaUsers />}
            </div>
            <div className={styles.actionContent}>
              <h3>{isQueueing ? "Cancel Queue" : "Quick Match"}</h3>
              <p>{isQueueing ? "Stop searching" : "Find opponent now"}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsBar;
