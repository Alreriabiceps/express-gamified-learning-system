import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const useMatchEvents = (user, apiFetch) => {
  const [showMatchFoundModal, setShowMatchFoundModal] = useState(false);
  const [showMatchConfirmModal, setShowMatchConfirmModal] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const navigate = useNavigate();

  // Handle match found event
  const handleMatchFound = useCallback((data) => {
    console.log("🎮 Match found via socket!", data);

    // Validate data
    if (!data || !data.lobbyId) {
      console.error("❌ Invalid match found data:", data);
      return;
    }

    // Show confirm modal first
    const confirmModalData = {
      lobbyId: data.lobbyId,
      opponentName: data.opponentName || "Opponent",
    };
    console.log(
      "🔍 Socket event - Setting confirm modal data:",
      confirmModalData
    );
    setConfirmData(confirmModalData);
    setShowMatchConfirmModal(true);
  }, []);

  // Handle match ready event (both players accepted)
  const handleMatchReady = useCallback(
    (data) => {
      console.log("🎮 Match ready via socket!", data);

      // Validate data
      if (!data || !data.lobbyId) {
        console.error("❌ Invalid match ready data:", data);
        return;
      }

      // Show the vs modal
      const vsModalData = {
        lobbyId: data.lobbyId,
        player1Name: user?.firstName + " " + user?.lastName || "Player 1",
        player2Name:
          data.opponentName || confirmData?.opponentName || "Opponent",
      };
      console.log("🎮 Setting match data for VS modal:", vsModalData);
      setMatchData(vsModalData);
      setShowMatchConfirmModal(false);
      setIsWaitingForOpponent(false);
      setShowMatchFoundModal(true);
    },
    [user, confirmData]
  );

  // Navigate to game
  const navigateToGame = useCallback(
    (lobbyId) => {
      console.log("🚀 Navigating to game with lobby:", lobbyId);
      navigate("/student/demo", {
        state: {
          gameMode: "pvp",
          roomId: lobbyId,
          // Other game data will be loaded by the game component
        },
      });
    },
    [navigate]
  );

  // Handle match confirmation
  const handleMatchAccept = async () => {
    console.log("✅ Match accepted");

    try {
      // Send acceptance to backend
      const response = await apiFetch("/api/match/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: user.id || user._id,
          lobbyId: confirmData.lobbyId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("🔍 Accept response:", data);

        if (data.ready) {
          // Both players accepted, show VS modal
          console.log("🎮 Both players accepted, showing VS modal");
          setShowMatchConfirmModal(false);

          const vsModalData = {
            lobbyId: confirmData.lobbyId,
            player1Name: user.firstName + " " + user.lastName,
            player2Name: confirmData.opponentName,
          };
          setMatchData(vsModalData);
          setShowMatchFoundModal(true);
        } else if (data.accepted) {
          // Player accepted, waiting for opponent
          console.log("⏳ Waiting for opponent to accept...");
          setIsWaitingForOpponent(true);
          // Keep the confirm modal open but show waiting state
          // We'll listen for socket events for when opponent accepts
        }
      } else {
        console.error("❌ Failed to accept match");
        // Handle error - maybe show error message
      }
    } catch (error) {
      console.error("❌ Error accepting match:", error);
    }
  };

  const handleMatchDecline = useCallback(() => {
    console.log("❌ Match declined");
    setShowMatchConfirmModal(false);
    setConfirmData(null);
    setIsWaitingForOpponent(false);
    // Could add logic here to notify the opponent
  }, []);

  // Handle proceeding from match found modal
  const handleProceedToGame = useCallback(() => {
    console.log("🚀 Proceeding to game with matchData:", matchData);
    setShowMatchFoundModal(false);
    if (matchData) {
      navigateToGame(matchData.lobbyId);
    } else {
      console.error("❌ No matchData available for navigation");
    }
  }, [matchData, navigateToGame]);

  // Handle game start event
  const handleGameStart = useCallback(
    async (data, apiFetch) => {
      try {
        console.log("🎮 Game start event received:", data);

        // Validate data
        if (!data || !data.players || data.players.length < 2) {
          console.error("❌ Invalid game start data:", data);
          return;
        }

        // Find current user and opponent for VS modal
        const currentUser = data.players.find(
          (p) => p.userId === (user?.id || user?._id)
        );
        const opponent = data.players.find(
          (p) => p.userId !== (user?.id || user?._id)
        );

        if (!currentUser || !opponent) {
          console.error(
            "❌ Could not find current user or opponent in game data"
          );
          return;
        }

        // Show the VS modal first
        const vsModalData = {
          lobbyId: data.lobbyId,
          player1Name: currentUser.name || currentUser.username || "Player 1",
          player2Name: opponent.name || opponent.username || "Player 2",
        };

        console.log(
          "🎮 Setting match data for VS modal (game:start):",
          vsModalData
        );
        setMatchData(vsModalData);
        setShowMatchConfirmModal(false);
        setIsWaitingForOpponent(false);
        setShowMatchFoundModal(true);

        // Normalize players for game initialization
        const formattedPlayers = data.players.map((player) => {
          if (typeof player === "object" && player.userId) {
            return {
              userId: player.userId,
              username:
                player.name ||
                player.username ||
                `${player.firstName || "Player"} ${
                  player.lastName || ""
                }`.trim(),
            };
          } else if (typeof player === "string") {
            return { userId: player, username: "Player" };
          } else {
            return {
              userId: player.userId || player.id || player._id,
              username:
                player.name ||
                player.username ||
                `${player.firstName || "Player"} ${
                  player.lastName || ""
                }`.trim(),
            };
          }
        });

        console.log("🔧 Formatted players result:", {
          original: data.players,
          formatted: formattedPlayers,
          userInfo: {
            id: user.id || user._id,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        });

        const sortedPlayerIds = formattedPlayers.map((p) => p.userId).sort();
        const isFirstPlayer =
          String(user.id || user._id) === String(sortedPlayerIds[0]);

        // Both players wait for game initialization to complete
        console.log(
          `🎮 ${
            isFirstPlayer ? "FIRST" : "SECOND"
          } PLAYER - WAITING FOR GAME INITIALIZATION`
        );
        console.log("📦 Sending data:", {
          lobbyId: data.lobbyId,
          players: formattedPlayers,
        });

        let gameData;
        try {
          const response = await apiFetch("/api/game/initialize", {
            method: "POST",
            body: JSON.stringify({
              lobbyId: data.lobbyId,
              players: formattedPlayers,
            }),
          });

          console.log("📡 Response status:", response.status);
          gameData = await response.json();
          console.log("🎯 Game data received:", gameData);
        } catch (error) {
          console.error("❌ Game initialization failed:", error);
          throw error;
        }

        if (gameData && gameData.success) {
          // Format players data properly for the Demo component
          const demoPlayers = data.players.map((player) => ({
            userId: player.userId || player._id || player.id,
            name:
              player.name ||
              player.username ||
              `${player.firstName || ""} ${player.lastName || ""}`.trim() ||
              "Player",
            username:
              player.username ||
              player.name ||
              `${player.firstName || ""} ${player.lastName || ""}`.trim() ||
              "Player",
            firstName: player.firstName,
            lastName: player.lastName,
          }));

          console.log("🎮 Sending formatted players to Demo:", demoPlayers);
          console.log("🎮 Game data for navigation:", {
            gameId: gameData.data.gameState.gameId,
            roomId: gameData.data.roomId,
            playersCount: demoPlayers.length,
            isFirstPlayer,
          });

          navigate("/student/demo", {
            state: {
              gameId: gameData.data.gameState.gameId,
              players: demoPlayers,
              currentPlayer: user.id,
              roomId: gameData.data.roomId || data.lobbyId,
              gameMode: "pvp",
              lobbyId: data.lobbyId,
            },
          });
        } else {
          throw new Error(
            `Failed to initialize game: ${gameData?.error || "Unknown error"}`
          );
        }
      } catch (err) {
        console.error("Error initializing game:", err);
        throw err;
      }
    },
    [user, navigate]
  );

  return {
    showMatchFoundModal,
    setShowMatchFoundModal,
    showMatchConfirmModal,
    setShowMatchConfirmModal,
    matchData,
    setMatchData,
    confirmData,
    setConfirmData,
    isWaitingForOpponent,
    setIsWaitingForOpponent,
    handleMatchFound,
    handleMatchReady,
    handleMatchAccept,
    handleMatchDecline,
    handleProceedToGame,
    handleGameStart,
    navigateToGame,
  };
};

export default useMatchEvents;
