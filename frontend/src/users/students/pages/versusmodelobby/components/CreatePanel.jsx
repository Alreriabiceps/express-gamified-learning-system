import React from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import styles from "../pages/VersusModeLobby.module.css";

const CreatePanel = ({
  lobbyForm,
  setLobbyForm,
  showCreateLobbyModal,
  setShowCreateLobbyModal,
  handleCreateLobby,
  isLoadingAction,
  hasActiveLobby,
  userCreatedLobby,
  handleDeleteLobby,
}) => {
  return (
    <div className={`${styles.panel} ${styles.createPanel}`}>
      <h3 className={styles.panelHeader}>
        <span className={styles.panelIcon}>
          <FaPlus />
        </span>{" "}
        Create Lobby
      </h3>
      <p className={styles.createDescription}>
        Create a lobby for other pilots to join your challenge!
      </p>

      {userCreatedLobby ? (
        <div className={styles.createdLobbyInfo}>
          <h4>Your Active Lobby</h4>
          <div className={styles.lobbyDetails}>
            <p>
              <strong>Name:</strong> {userCreatedLobby.name}
            </p>
            <p>
              <strong>Status:</strong> {userCreatedLobby.status}
            </p>
            <p>
              <strong>Players:</strong> {userCreatedLobby.players?.length || 0}/
              {userCreatedLobby.maxPlayers}
            </p>
          </div>
          <div className={styles.lobbyActions}>
            <button
              onClick={() => handleDeleteLobby(userCreatedLobby._id)}
              className={`${styles.gameButton} ${styles.deleteButton}`}
              disabled={isLoadingAction}
            >
              {isLoadingAction ? "Deleting..." : "Delete Lobby"}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.lobbyButtons}>
          <button
            onClick={() => {
              setLobbyForm((prev) => ({ ...prev, isPrivate: false }));
              setShowCreateLobbyModal(true);
            }}
            className={`${styles.gameButton} ${styles.createButton}`}
            disabled={isLoadingAction}
          >
            {isLoadingAction ? "Creating..." : "Open Lobby"}
          </button>
          <button
            onClick={() => {
              setLobbyForm((prev) => ({ ...prev, isPrivate: true }));
              setShowCreateLobbyModal(true);
            }}
            className={`${styles.gameButton} ${styles.createButton}`}
            disabled={isLoadingAction}
          >
            {isLoadingAction ? "Creating..." : "Private Lobby"}
          </button>
        </div>
      )}
    </div>
  );
};

export default CreatePanel;
