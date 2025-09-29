import React from "react";
import {
  FaSearch,
  FaSyncAlt,
  FaUsers,
  FaPlay,
  FaTimes,
  FaUserCircle,
  FaLock,
  FaArrowLeft,
  FaArrowRight,
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

const MainContent = ({
  // Lobby search and display
  lobbySearchTerm,
  setLobbySearchTerm,
  isLoadingLobbies,
  currentLobbies,
  totalPages,
  currentPage,
  setCurrentPage,
  getUniqueLobbyKey,
  lobbyTimers,
  handleJoinClick,
  handleDeleteLobby,
  isLoadingAction,
  isQueueing,
  user,
  hasActiveLobby,
  fetchLobbies,
}) => {
  return (
    <div className={styles.mainContent}>
      <div className={styles.lobbyBrowser}>
        {/* Search Header */}
        <div className={styles.browserHeader}>
          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <h2 className={styles.browserTitle}>
                <FaSearch className={styles.titleIcon} />
                Available Lobbies
              </h2>
              <p className={styles.browserSubtitle}>
                Join existing battles or create your own room
              </p>
            </div>
            <div className={styles.headerStats}>
              <span className={styles.lobbyCount}>
                {currentLobbies.length} lobbies found
              </span>
            </div>
          </div>

          <div className={styles.searchControls}>
            <div className={styles.searchWrapper}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by lobby name or host..."
                value={lobbySearchTerm}
                onChange={(e) => setLobbySearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <button
              className={styles.refreshBtn}
              onClick={fetchLobbies}
              disabled={isLoadingLobbies}
              title="Refresh lobbies"
            >
              <FaSyncAlt className={isLoadingLobbies ? styles.spinning : ""} />
            </button>
          </div>
        </div>

        {/* Lobby Grid */}
        <div className={styles.lobbyContainer}>
          {isLoadingLobbies ? (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner}>
                <FaSyncAlt className={styles.spinning} />
              </div>
              <h3>Loading Lobbies</h3>
              <p>Finding available battles...</p>
            </div>
          ) : currentLobbies.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <FaUsers />
              </div>
              <h3>No Lobbies Available</h3>
              <p>
                {lobbySearchTerm
                  ? "No lobbies match your search. Try different terms or create your own!"
                  : "Be the first to create a lobby and start an epic battle!"}
              </p>
            </div>
          ) : (
            <div className={styles.lobbyGrid}>
              {currentLobbies.map((lobby) => (
                <div
                  key={getUniqueLobbyKey(lobby)}
                  className={styles.lobbyCard}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.lobbyTitleRow}>
                      <h3 className={styles.lobbyName}>{lobby.name}</h3>
                      {lobby.isPrivate && (
                        <div className={styles.privateBadge}>
                          <FaLock />
                          <span>Private</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.lobbyStatus}>
                      <span
                        className={`${styles.statusDot} ${styles.online}`}
                      ></span>
                      <span className={styles.statusText}>Active</span>
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.lobbyDetails}>
                      <div className={styles.hostInfo}>
                        <FaUserCircle className={styles.hostIcon} />
                        <div className={styles.hostDetails}>
                          <span className={styles.hostLabel}>Host</span>
                          <span className={styles.hostName}>
                            {lobby.hostId?.firstName} {lobby.hostId?.lastName}
                          </span>
                        </div>
                      </div>

                      <div className={styles.playersInfo}>
                        <FaUsers className={styles.playersIcon} />
                        <div className={styles.playersDetails}>
                          <span className={styles.playersLabel}>Players</span>
                          <span className={styles.playersCount}>
                            {lobby.players?.length || 0}/2
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    {lobby.hostId?._id === user?.id ? (
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => handleDeleteLobby(lobby._id)}
                        disabled={isLoadingAction}
                      >
                        <FaTimes />
                        <span>Delete Lobby</span>
                      </button>
                    ) : (
                      <button
                        className={`${styles.actionBtn} ${styles.joinBtn}`}
                        onClick={() => handleJoinClick(lobby)}
                        disabled={
                          isLoadingAction || isQueueing || hasActiveLobby
                        }
                      >
                        <FaPlay />
                        <span>Join Battle</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.paginationWrapper}>
            <div className={styles.pagination}>
              <button
                className={`${styles.pageBtn} ${styles.prevBtn}`}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <FaArrowLeft />
                <span>Previous</span>
              </button>

              <div className={styles.pageInfo}>
                <span className={styles.currentPage}>{currentPage}</span>
                <span className={styles.pageSeparator}>of</span>
                <span className={styles.totalPages}>{totalPages}</span>
              </div>

              <button
                className={`${styles.pageBtn} ${styles.nextBtn}`}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                <span>Next</span>
                <FaArrowRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainContent;
