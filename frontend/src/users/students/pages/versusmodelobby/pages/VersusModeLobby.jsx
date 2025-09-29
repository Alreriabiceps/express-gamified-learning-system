import React, { useState, useEffect } from "react";
import { useAuth } from "../../../../../contexts/AuthContext";
import styles from "./VersusModeLobby.module.css";

// Custom hooks
import useWebSocket from "../hooks/useWebSocket";
import useLobbyManagement from "../hooks/useLobbyManagement";
import useMatchmaking from "../hooks/useMatchmaking";
import useMatchEvents from "../hooks/useMatchEvents";
import useQueueTimer from "../hooks/useQueueTimer";

// Components
import CreateLobbyModal from "../components/CreateLobbyModal";
import JoinLobbyModal from "../components/JoinLobbyModal";
import MatchFoundModal from "../components/MatchFoundModal";
import MatchConfirmModal from "../components/MatchConfirmModal";
import VersusLobbyHeader from "../components/VersusLobbyHeader";
import QuickActionsBar from "../components/QuickActionsBar";
import MainContent from "../components/MainContent";
import InvitePanel from "../components/InvitePanel";
import CreatePanel from "../components/CreatePanel";
import QueuePanel from "../components/QueuePanel";
import JoinLobbyPanel from "../components/JoinLobbyPanel";
import FloatingStars from "../../../components/FloatingStars/FloatingStars";

const VersusModeLobby = () => {
  const { user, token, logout } = useAuth();

  // Local state
  const [lobbySearchTerm, setLobbySearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateLobbyModal, setShowCreateLobbyModal] = useState(false);
  const [lobbyForm, setLobbyForm] = useState({
    name: "",
    isPrivate: false,
    password: "",
  });
  const itemsPerPage = 5; // Number of lobbies per page

  // Initialize WebSocket first to get apiFetch
  const webSocket = useWebSocket(
    token,
    user,
    null, // Will be set after matchEvents is created
    null, // Will be set after matchEvents is created
    null, // Will be set after matchEvents is created
    // Pass lobby update handler (will be provided by lobby management hook)
    null
  );

  // Custom hooks for complex logic
  const matchEvents = useMatchEvents(user, webSocket.apiFetch);

  const lobbyManagement = useLobbyManagement(
    user,
    token,
    webSocket.apiFetch,
    logout
  );

  const matchmaking = useMatchmaking(
    user,
    webSocket.apiFetch,
    webSocket.socketRef
  );

  // Initialize lobby update handler and match events now that we have all hooks
  useEffect(() => {
    // Update the WebSocket hook's lobby update handler
    const updateHandler = lobbyManagement.handleLobbyUpdate;
    // This is a bit of a workaround - in a real app you might restructure this differently
    if (webSocket.socketRef.current) {
      webSocket.socketRef.current.off("lobby:created");
      webSocket.socketRef.current.off("lobby:updated");
      webSocket.socketRef.current.off("lobby:deleted");
      webSocket.socketRef.current.off("match_found");
      webSocket.socketRef.current.off("match_ready");
      webSocket.socketRef.current.off("game:start");

      webSocket.socketRef.current.on("lobby:created", (lobby) => {
        updateHandler("created", lobby);
      });
      webSocket.socketRef.current.on("lobby:updated", (lobby) => {
        updateHandler("updated", lobby);
      });
      webSocket.socketRef.current.on("lobby:deleted", ({ lobbyId }) => {
        updateHandler("deleted", { lobbyId });
      });

      // Set up match event handlers
      webSocket.socketRef.current.on(
        "match_found",
        matchEvents.handleMatchFound
      );
      webSocket.socketRef.current.on(
        "match_ready",
        matchEvents.handleMatchReady
      );
      webSocket.socketRef.current.on("game:start", (data) => {
        matchEvents.handleGameStart(data, webSocket.apiFetch);
      });
    }
  }, [
    lobbyManagement.handleLobbyUpdate,
    webSocket.socketRef,
    matchEvents.handleMatchFound,
    matchEvents.handleMatchReady,
    matchEvents.handleGameStart,
  ]);

  // Queue timer
  useQueueTimer(
    matchmaking.isQueueing,
    matchmaking.queueTime,
    matchmaking.setQueueTime,
    matchmaking.queueIntervalRef
  );

  // Calculate active players count from lobbies
  const getActivePlayersCount = () => {
    if (!lobbyManagement.lobbies || lobbyManagement.lobbies.length === 0)
      return 0;
    return lobbyManagement.lobbies.reduce((total, lobby) => {
      return total + (lobby.players?.length || 0);
    }, 0);
  };

  // Initial load effect
  useEffect(() => {
    if (user?.id) {
      lobbyManagement.fetchLobbies();
      lobbyManagement.checkUserCreatedLobby();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Clean up matchmaking state when component unmounts
      if (matchmaking.cleanup) {
        matchmaking.cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Event handlers for component actions
  const handleCreateLobbyClick = () => {
    setShowCreateLobbyModal(true);
  };

  const handleCreateLobby = async () => {
    const success = await lobbyManagement.handleCreateLobby(lobbyForm);
    if (success) {
      setShowCreateLobbyModal(false);
      setLobbyForm({ name: "", isPrivate: false, password: "" });
    }
  };

  const handleToggleQueue = () => {
    if (matchmaking.isQueueing) {
      matchmaking.handleCancelQueue();
    } else {
      matchmaking
        .handleQueueMatchmaking(
          matchEvents.handleMatchFound,
          matchEvents.handleMatchReady
        )
        .catch((error) => {
          console.error("❌ Matchmaking error:", error);
          webSocket.setError(
            error.message || "Failed to join matchmaking queue"
          );
        });
    }
  };

  // Update lobby timers when lobbies change
  useEffect(() => {
    const newTimers = {};
    lobbyManagement.lobbies.forEach((lobby) => {
      if (lobby.timeRemaining) newTimers[lobby._id] = lobby.timeRemaining;
    });
    lobbyManagement.setLobbyTimers(newTimers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyManagement.lobbies, lobbyManagement.setLobbyTimers]);

  // Pagination helpers
  const filteredLobbies = lobbyManagement.lobbies.filter(
    (lobby) =>
      lobby.name.toLowerCase().includes(lobbySearchTerm.toLowerCase()) ||
      (lobby.hostId?.firstName?.toLowerCase() || "").includes(
        lobbySearchTerm.toLowerCase()
      ) ||
      (lobby.hostId?.lastName?.toLowerCase() || "").includes(
        lobbySearchTerm.toLowerCase()
      )
  );
  const indexOfLastLobby = currentPage * itemsPerPage;
  const indexOfFirstLobby = indexOfLastLobby - itemsPerPage;
  const currentLobbies = filteredLobbies.slice(
    indexOfFirstLobby,
    indexOfLastLobby
  );
  const totalPages = Math.ceil(filteredLobbies.length / itemsPerPage);

  // Handle join lobby submission
  const handleJoinLobbySubmit = async (password) => {
    const success = await lobbyManagement.handleJoinLobby(
      lobbyManagement.selectedLobby._id,
      password
    );
    return success;
  };

  // Get unique lobby key for React keys
  const getUniqueLobbyKey = (lobby) =>
    `${lobby._id}-${lobby.status}-${lobby.players?.length || 0}`;

  // Close modal handlers
  const handleCloseCreateModal = () => {
    setShowCreateLobbyModal(false);
    setLobbyForm({ name: "", isPrivate: false, password: "" });
  };

  const handleCloseJoinModal = () => {
    lobbyManagement.setShowJoinLobbyModal(false);
    lobbyManagement.setSelectedLobby(null);
    lobbyManagement.setJoinError(null);
  };

  return (
    <div className={styles.pvpContainer}>
      <FloatingStars />
      <div className={styles.backgroundEffects}>
        <div className={styles.floatingShape1}></div>
        <div className={styles.floatingShape2}></div>
        <div className={styles.floatingShape3}></div>
      </div>

      <div className={styles.contentWrapper}>
        <VersusLobbyHeader
          wsConnected={webSocket.wsConnected}
          activePlayersCount={getActivePlayersCount()}
          isQueueing={matchmaking.isQueueing}
          queueTime={matchmaking.queueTime}
          error={webSocket.error}
          setError={webSocket.setError}
          onRetry={lobbyManagement.fetchLobbies}
        />

        <div className={styles.gameContent}>
          <QuickActionsBar
            hasActiveLobby={lobbyManagement.hasActiveLobby}
            isLoadingAction={lobbyManagement.isLoadingAction}
            isQueueing={matchmaking.isQueueing}
            onCreateLobby={handleCreateLobbyClick}
            onToggleQueue={handleToggleQueue}
          />

          <MainContent
            lobbySearchTerm={lobbySearchTerm}
            setLobbySearchTerm={setLobbySearchTerm}
            isLoadingLobbies={lobbyManagement.isLoadingLobbies}
            currentLobbies={currentLobbies}
            totalPages={totalPages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            getUniqueLobbyKey={getUniqueLobbyKey}
            lobbyTimers={lobbyManagement.lobbyTimers}
            handleJoinClick={lobbyManagement.handleJoinClick}
            handleDeleteLobby={lobbyManagement.handleDeleteLobby}
            isLoadingAction={lobbyManagement.isLoadingAction}
            isQueueing={matchmaking.isQueueing}
            user={user}
            hasActiveLobby={lobbyManagement.hasActiveLobby}
            fetchLobbies={lobbyManagement.fetchLobbies}
          />
        </div>
      </div>

      {/* Modals */}
      {showCreateLobbyModal && (
        <CreateLobbyModal
          isOpen={showCreateLobbyModal}
          onClose={handleCloseCreateModal}
          onSubmit={handleCreateLobby}
          form={lobbyForm}
          setForm={setLobbyForm}
          isLoading={lobbyManagement.isLoadingAction}
          hasActiveLobby={lobbyManagement.hasActiveLobby}
        />
      )}

      {lobbyManagement.showJoinLobbyModal && (
        <JoinLobbyModal
          isOpen={lobbyManagement.showJoinLobbyModal}
          onClose={handleCloseJoinModal}
          onSubmit={handleJoinLobbySubmit}
          lobby={lobbyManagement.selectedLobby}
          isLoading={lobbyManagement.isLoadingAction}
          error={lobbyManagement.joinError}
        />
      )}

      {/* Match Confirm Modal */}
      {matchEvents.showMatchConfirmModal && matchEvents.confirmData && (
        <MatchConfirmModal
          isOpen={matchEvents.showMatchConfirmModal}
          opponentName={matchEvents.confirmData.opponentName}
          lobbyId={matchEvents.confirmData.lobbyId}
          onAccept={matchEvents.handleMatchAccept}
          onDecline={matchEvents.handleMatchDecline}
          timeout={30}
          isWaitingForOpponent={matchEvents.isWaitingForOpponent}
        />
      )}

      {/* Match Found Modal */}
      {matchEvents.showMatchFoundModal && matchEvents.matchData && (
        <MatchFoundModal
          isOpen={matchEvents.showMatchFoundModal}
          player1Name={matchEvents.matchData.player1Name}
          player2Name={matchEvents.matchData.player2Name}
          lobbyId={matchEvents.matchData.lobbyId}
          onProceed={matchEvents.handleProceedToGame}
        />
      )}
    </div>
  );
};

export default VersusModeLobby;
