// React and routing imports
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useLocation } from "react-router-dom";

// CSS imports
import "./pages/demo.css";
import "./pages/mobile.css";

// Icon imports
import { FaDice } from "react-icons/fa";

// UI components
import FloatingStars from "../../components/FloatingStars/FloatingStars";

// Contexts and hooks
import { useAuth } from "../../../../contexts/AuthContext";
import socketManager from "../../../../shared/utils/socketManager";

// Performance utilities
import LoadTester from "../../../../utils/loadTesting";
import MemoryProfiler from "../../../../utils/memoryProfiler";
import NetworkOptimizer from "../../../../utils/networkOptimizer";
import IntelligentCache from "../../../../utils/intelligentCache";
import BundleOptimizer from "../../../../utils/bundleOptimizer";

// Import custom hooks and components
import { QuestionModal, VictoryModal, BattleField } from "./components";
import QuickResultPopup from "./components/QuickResultPopup";
import usePowerUps from "./powerups/usePowerUps";
import PowerUpPanel from "./powerups/PowerUpPanel";
import { PowerUpId, MAX_HP } from "./powerups/constants";

// Mobile detection hook
const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setIsMobile(mobile);
      setIsTouch(touch);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return { isMobile, isTouch };
};

// Main Demo Component - REAL-TIME PVP MODE
const Demo = () => {
  // Extract game data from location state (passed from VersusModeLobby)
  const location = useLocation();
  const { user } = useAuth();
  const socketRef = useRef(null);
  const { isMobile } = useMobileDetection();

  // Game initialization data from lobby
  const gameData = location.state || {};
  const {
    gameId,
    players: lobbyPlayers = [],
    roomId: initialRoomId,
    gameMode = "demo",
    lobbyId,
  } = gameData;

  // Room ID state that can be updated
  const [roomId, setRoomId] = useState(
    initialRoomId || localStorage.getItem("currentGameRoomId")
  );

  // Debug roomId on component mount
  useEffect(() => {
    console.log("🔍 RoomId debug:", {
      initialRoomId,
      localStorageRoomId: localStorage.getItem("currentGameRoomId"),
      finalRoomId: roomId,
      hasRoomId: !!roomId,
    });
  }, [initialRoomId, roomId]);

  // Real-time game state
  const [gameState, setGameState] = useState("initializing"); // initializing, playing, finished

  // Save roomId to localStorage when it changes
  useEffect(() => {
    if (roomId) {
      localStorage.setItem("currentGameRoomId", roomId);
    }
  }, [roomId]);

  // Clear localStorage when game ends
  useEffect(() => {
    if (gameState === "finished") {
      localStorage.removeItem("currentGameRoomId");
    }
  }, [gameState]);
  const [gamePhase, setGamePhase] = useState("setup"); // setup, cardSelection, answering, result
  const [currentTurnUserId, setCurrentTurnUserId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isConnected, setIsConnected] = useState(null); // null = unknown, true = connected, false = disconnected
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [questionPhase, setQuestionPhase] = useState(false);
  const [winner, setWinner] = useState(null);
  const [error, setError] = useState(null);

  // Error handling and reconnection state
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Performance optimization: debounce timer refs
  const gameStateUpdateTimeoutRef = useRef(null);
  const playerUpdateTimeoutRef = useRef(null);

  // Performance monitoring
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  const loadTesterRef = useRef(null);
  const memoryProfilerRef = useRef(null);
  const networkOptimizerRef = useRef(null);
  const intelligentCacheRef = useRef(null);
  const bundleOptimizerRef = useRef(null);

  // Track render performance
  useEffect(() => {
    renderCountRef.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;

    if (renderCountRef.current > 1) {
      console.log(
        `🔄 Demo render #${renderCountRef.current} (${timeSinceLastRender}ms since last render)`
      );
    }
  });

  // Initialize performance monitoring tools
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.hostname === "localhost"
    ) {
      // Initialize load tester
      loadTesterRef.current = new LoadTester();
      loadTesterRef.current.startMemoryMonitoring();

      // Initialize memory profiler
      memoryProfilerRef.current = new MemoryProfiler();
      memoryProfilerRef.current.startMonitoring(3000); // Check every 3 seconds

      // Initialize network optimizer
      networkOptimizerRef.current = new NetworkOptimizer();
      if (socketRef.current) {
        networkOptimizerRef.current.initialize(socketRef.current);
        networkOptimizerRef.current.optimizeGameEvents();
      }

      // Initialize intelligent cache
      intelligentCacheRef.current = new IntelligentCache({
        maxSize: 200,
        defaultTTL: 300000, // 5 minutes
        cleanupInterval: 30000, // 30 seconds
      });

      // Initialize bundle optimizer
      bundleOptimizerRef.current = new BundleOptimizer();
      bundleOptimizerRef.current.initialize();
      bundleOptimizerRef.current.preloadCriticalResources();
      bundleOptimizerRef.current.monitorPerformance();

      // Add development controls to window
      window.startLoadTest = (count = 10) => {
        loadTesterRef.current.simulatePlayers(count);
      };

      window.startMemoryProfiling = () => {
        memoryProfilerRef.current.startMonitoring();
      };

      window.stopMemoryProfiling = () => {
        memoryProfilerRef.current.stopMonitoring();
      };

      window.getMemoryStats = () => {
        return memoryProfilerRef.current.getStats();
      };

      window.getNetworkStats = () => {
        return networkOptimizerRef.current.getStats();
      };

      window.generateNetworkReport = () => {
        networkOptimizerRef.current.generateReport();
      };

      window.getCacheStats = () => {
        return intelligentCacheRef.current.getStats();
      };

      window.generateCacheReport = () => {
        intelligentCacheRef.current.generateReport();
      };

      window.clearCache = () => {
        intelligentCacheRef.current.clear();
      };

      window.getBundleStats = () => {
        return bundleOptimizerRef.current.getStats();
      };

      window.generateBundleReport = () => {
        bundleOptimizerRef.current.generateReport();
      };

      window.optimizeBundle = () => {
        bundleOptimizerRef.current.analyzeBundle();
      };

      console.log("🧪 Performance tools available:");
      console.log("  - window.startLoadTest(10)");
      console.log("  - window.startMemoryProfiling()");
      console.log("  - window.stopMemoryProfiling()");
      console.log("  - window.getMemoryStats()");
      console.log("  - window.getNetworkStats()");
      console.log("  - window.generateNetworkReport()");
      console.log("  - window.getCacheStats()");
      console.log("  - window.generateCacheReport()");
      console.log("  - window.clearCache()");
      console.log("  - window.getBundleStats()");
      console.log("  - window.generateBundleReport()");
      console.log("  - window.optimizeBundle()");
    }

    return () => {
      if (loadTesterRef.current) {
        loadTesterRef.current.cleanup();
      }
      if (memoryProfilerRef.current) {
        memoryProfilerRef.current.cleanup();
      }
      if (networkOptimizerRef.current) {
        networkOptimizerRef.current.cleanup();
      }
      if (intelligentCacheRef.current) {
        intelligentCacheRef.current.cleanup();
      }
      if (bundleOptimizerRef.current) {
        bundleOptimizerRef.current.cleanup();
      }
    };
  }, [socketRef]);

  // Track opponent card count for visual display
  const [opponentCardCount, setOpponentCardCount] = useState(0);

  // Question Modal State
  const [opponentQuestion, setOpponentQuestion] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [questionDeadlineTs, setQuestionDeadlineTs] = useState(null);

  // Results Phase State
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultData, setResultData] = useState(null);

  // Processing flags to prevent duplicate event handling
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);

  // Cards are now managed by the backend game state

  // Game state refs for socket events
  const gameStateRef = useRef(gameState);
  const playersRef = useRef(players);
  const currentTurnRef = useRef(currentTurnUserId);

  // Update refs when state changes
  useEffect(() => {
    gameStateRef.current = gameState;
    playersRef.current = players;
    currentTurnRef.current = currentTurnUserId;
  }, [gameState, players, currentTurnUserId]);

  // Memoize expensive player calculations
  const playerCalculations = useMemo(() => {
    const myPlayerIndex = players.findIndex((p) => p.userId === user?.id);
    const opponentIndex = myPlayerIndex === 0 ? 1 : 0;
    const myPlayerId = user?.id;
    const isMyTurn = currentTurnUserId === myPlayerId;

    return {
      myPlayerIndex,
      opponentIndex,
      myPlayerId,
      isMyTurn,
    };
  }, [players, user?.id, currentTurnUserId]);

  // Destructure for easier access
  const { myPlayerIndex, opponentIndex, isMyTurn } = playerCalculations;

  // Local toast for power-up usage
  const [powerUpToast, setPowerUpToast] = useState(null);
  const showPowerUpToast = useCallback((text) => {
    setPowerUpToast(text);
    setTimeout(() => setPowerUpToast(null), 1800);
  }, []);

  // In-turn power-up indicators (cleared when turn changes)
  const [opponentTurnPowerUp, setOpponentTurnPowerUp] = useState(null);
  const [myTurnPowerUp, setMyTurnPowerUp] = useState(null);
  const [armedDefense, setArmedDefense] = useState(null);

  // Cosmetic taunt overlay
  const [showTauntOverlay, setShowTauntOverlay] = useState(false);
  const [tauntImgSrc, setTauntImgSrc] = useState("/222.png");

  // Power-ups: availability and usage
  const { availablePowerUpId, isAvailable, usePowerUp } = usePowerUps({
    isMyTurn,
    players,
    myPlayerIndex,
    opponentIndex,
    socketRef,
    roomId,
    gameId,
    onUsed: (powerUpId) => {
      const nameMap = {
        HEALTH_POTION: "Used Health Potion (+20 HP)",
        DISCARD_DRAW_5: "Used Discard & Draw 5",
        DOUBLE_DAMAGE: "Double Damage active (x2)",
        DAMAGE_ROULETTE: "Rolled Damage Roulette",
        HP_SWAP: "Swapped HP",
        EMOJI_TAUNT: "Sent Emoji Taunt",
        MIRROR_SHIELD: "Armed Mirror Shield",
        BARRIER: "Armed Barrier",
        SAFETY_NET: "Armed Safety Net",
      };
      showPowerUpToast(nameMap[powerUpId] || "Power-up used");
    },
    availabilityChance: 1.0, // 100% chance for testing
    // forcedPowerUpId: PowerUpId.HEALTH_POTION,
  });

  // Debug power-up availability
  useEffect(() => {
    if (isMyTurn) {
      console.log("🎯 Power-up availability:", {
        isMyTurn,
        availablePowerUpId,
        isAvailable,
        turnKey: `${user?.id}_${Date.now()}`,
      });
    }
  }, [isMyTurn, availablePowerUpId, isAvailable, user?.id]);

  // Error handling and reconnection functions
  const handleConnectionError = useCallback(
    (error) => {
      console.error("❌ Connection error:", error);
      setConnectionLost(true);
      setIsConnected(false);

      // Attempt reconnection if we haven't exceeded max attempts
      if (reconnectAttempts < 3) {
        setIsReconnecting(true);
        setReconnectAttempts((prev) => prev + 1);

        // Attempt reconnection after a delay
        setTimeout(() => {
          console.log(
            `🔄 Attempting reconnection ${reconnectAttempts + 1}/3...`
          );
          if (socketRef.current) {
            socketRef.current.connect();
          }
        }, 2000 * (reconnectAttempts + 1)); // Exponential backoff
      } else {
        setError("Connection lost. Please refresh the page to reconnect.");
      }
    },
    [reconnectAttempts, socketRef]
  );

  const handleReconnectionSuccess = useCallback(() => {
    console.log("✅ Reconnection successful!");
    setIsReconnecting(false);
    setConnectionLost(false);
    setReconnectAttempts(0);
    setError(null);
  }, []);

  // Optimized game state validation function
  const validateGameState = useCallback((gameState) => {
    // Quick null check
    if (!gameState) {
      throw new Error("Game state is null or undefined");
    }

    // Quick array check
    if (!Array.isArray(gameState.players) || gameState.players.length !== 2) {
      throw new Error("Invalid game state: missing or invalid players array");
    }

    // Validate only essential fields for performance
    for (let i = 0; i < gameState.players.length; i++) {
      const player = gameState.players[i];
      if (!player.userId || typeof player.hp !== "number" || player.hp < 0) {
        throw new Error(`Invalid player ${i}: missing userId or invalid HP`);
      }
    }

    return true;
  }, []);

  // Cards are now created by the backend game engine

  // Card replacement is now handled by the backend game engine
  const replaceUsedCard = useCallback(() => {
    // This function is no longer needed as cards are managed by backend
    console.log("Card replacement handled by backend");
  }, []);

  // Card replacement is now handled by the backend game engine

  // Get socket connection from global manager
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        console.log("🔌 Initializing socket connection...");
        const socket = await socketManager.getSocket();
        socketRef.current = socket;
        console.log("🔌 Socket obtained from manager:", socket.id);

        // Set connected status based on socket state
        console.log("🔌 Socket connection state:", socket.connected);
        setIsConnected(socket.connected);

        // If socket is already connected, set connected state
        if (socket.connected) {
          console.log("🔌 Socket already connected, setting connected state");
          setIsConnected(true);
        } else {
          console.log("🔌 Socket not yet connected, waiting for connect event");
        }
      } catch (error) {
        console.error("❌ Failed to get socket from manager:", error);
        setIsConnected(false);
      }
    };

    initializeSocket();
  }, []);

  // Memoized question data validation (moved above restoreGameState to avoid TDZ)
  const validateQuestionData = useCallback((card) => {
    if (!card) return null;

    // If card already has proper questionData, return it
    if (
      card.questionData &&
      card.questionData._id &&
      card.questionData.questionText
    ) {
      return card;
    }

    // Otherwise, create proper questionData structure
    const fixedCard = {
      ...card,
      questionData: {
        _id: card.id || card._id || `temp-${Date.now()}`,
        questionText:
          card.question || card.questionText || "Question not available",
        choices: card.choices || ["A", "B", "C", "D"],
        correctAnswer: card.answer || card.correctAnswer || "A",
        bloomsLevel: card.bloomLevel || "Remembering",
      },
    };

    console.log("🔧 Fixed question data structure:", fixedCard);
    return fixedCard;
  }, []);

  // Restore game state from backend after page refresh
  const restoreGameState = useCallback(
    async (roomId) => {
      if (!roomId || !user?.id) {
        console.log(
          "❌ Cannot restore game state - missing roomId or userId:",
          {
            roomId,
            userId: user?.id,
          }
        );
        return false;
      }

      try {
        console.log("🔄 Attempting to restore game state for room:", roomId);
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/game/state/${roomId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("📡 API response status:", response.status);
        console.log("📡 API response ok:", response.ok);

        if (response.status === 404) {
          console.warn(
            "⚠️ No saved game state for this room; skipping restore."
          );
          return false; // gracefully stop attempting restore
        }

        if (response.ok) {
          const data = await response.json();
          console.log("📡 API response data:", data);

          if (data.success && data.data) {
            console.log("✅ Game state restored from backend:", data.data);
            const gameState = data.data;

            // Update players with restored data
            if (gameState.players) {
              console.log("🎮 Restoring players:", gameState.players);
              console.log(
                "🎮 Player 1 cards:",
                gameState.players[0]?.cards?.length || 0
              );
              console.log(
                "🎮 Player 2 cards:",
                gameState.players[1]?.cards?.length || 0
              );
              console.log("🎮 Player 1 HP:", gameState.players[0]?.hp);
              console.log("🎮 Player 2 HP:", gameState.players[1]?.hp);

              setPlayers(gameState.players);
              setGameState(gameState.gameState || "playing");
              setGamePhase(gameState.gamePhase || "cardSelection");
              setCurrentTurnUserId(gameState.currentTurn);
              setWaitingForOpponent(false);

              // Check if there's an active question that should show the modal for the opponent (answerer)
              if (
                gameState.gamePhase === "answering" &&
                gameState.selectedCard &&
                gameState.currentTurn !== user?.id
              ) {
                console.log(
                  "❓ Active question detected, restoring question modal:",
                  gameState.selectedCard
                );

                // Find the opponent (the one who sent the question)
                const opponent = gameState.players.find(
                  (p) => p.userId !== user?.id
                );
                if (opponent) {
                  // Validate and set the question data
                  const validatedCard = validateQuestionData(
                    gameState.selectedCard
                  );
                  if (validatedCard) {
                    setOpponentQuestion(validatedCard);
                    setQuestionPhase(true);
                    console.log(
                      "✅ Question modal restored for opponent's card"
                    );
                  } else {
                    console.error(
                      "❌ Invalid selectedCard data during restoration:",
                      gameState.selectedCard
                    );
                  }
                }
              }

              // Update room ID if different
              if (gameState.roomId && gameState.roomId !== roomId) {
                setRoomId(gameState.roomId);
              }

              console.log("🎮 Game state restored successfully");
              return true;
            } else {
              console.log("❌ No players data in restored game state");
            }
          } else {
            console.log("❌ API response not successful:", data);
          }
        } else {
          console.log("❌ API request failed with status:", response.status);
          const errorText = await response.text();
          console.log("❌ Error response:", errorText);
        }
      } catch (error) {
        console.error("❌ Failed to restore game state:", error);
      }

      return false;
    },
    [user?.id, validateQuestionData]
  );

  // Initialize game from lobby data
  const initializeGame = useCallback(() => {
    if (!lobbyPlayers.length || !user?.id) {
      console.log("⏳ Waiting for game data...");
      setWaitingForOpponent(true);
      return;
    }

    console.log("🎮 Initializing game with data:", {
      gameId,
      lobbyPlayers,
      currentPlayer: user.id,
      roomId,
      gameMode,
      lobbyId,
    });

    // Initialize players with real data - HP will be set by backend game state
    const initializedPlayers = lobbyPlayers.map((player) => ({
      id: player.userId || player._id || player.id,
      userId: player.userId || player._id || player.id,
      name:
        player.name ||
        player.username ||
        `${player.firstName || ""} ${player.lastName || ""}`.trim() ||
        "Player",
      hp: 100, // Temporary - will be updated by backend
      maxHp: 100,
      cards: [], // Will be populated when questions load
    }));

    setPlayers(initializedPlayers);
    setGameState("playing");
    setGamePhase("challenge");
    setWaitingForOpponent(false);

    console.log(
      "🎮 Frontend initialized players with temporary HP, waiting for backend game state..."
    );

    // Initialize opponent card count
    const myPlayerIndex = initializedPlayers.findIndex(
      (p) => p.userId === user?.id
    );
    const opponentIndex = myPlayerIndex === 0 ? 1 : 0;
    const opponent = initializedPlayers[opponentIndex];
    if (opponent && opponent.cards) {
      setOpponentCardCount(opponent.cards.length);
    }

    // Determine who goes first (room creator goes first)
    const roomCreator = lobbyPlayers[0]; // First player in lobby is usually the creator
    const firstPlayerId =
      roomCreator?.userId || roomCreator?._id || roomCreator?.id;
    setCurrentTurnUserId(firstPlayerId);

    console.log("🎯 Game initialized:", {
      players: initializedPlayers,
      firstPlayer: firstPlayerId,
      isMyTurn: firstPlayerId === user.id,
    });
  }, [lobbyPlayers, user?.id, gameId, roomId, gameMode, lobbyId]);

  // Helper function to reset all modal states
  const resetAllModalStates = useCallback(() => {
    console.log("🔄 Resetting all modal states");
    setQuestionPhase(false);
    setOpponentQuestion(null);
    setShowResultsModal(false);
    setResultData(null);
  }, []);

  // Socket event handlers
  const handleSocketEvents = useCallback(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    // Connection events
    socket.on("connect", () => {
      console.log("🔌 Socket connected to game");
      setIsConnected(true);
      setError(null);
      handleReconnectionSuccess();

      // Rejoin game room if we have a roomId
      if (roomId) {
        console.log("🔄 Reconnecting to game room:", roomId);
        // Add a small delay to ensure socket is fully connected
        setTimeout(() => {
          socket.emit("join_game_room", { roomId });
          console.log("✅ Rejoined game room:", roomId);
        }, 500);
      }
    });

    // Server can proactively ask this client to join the room
    socket.on("server:request_join_room", ({ roomId: requestedRoomId }) => {
      if (!requestedRoomId) return;
      console.log("📥 Server requested join for room:", requestedRoomId);
      socket.emit("join_game_room", { roomId: requestedRoomId });
    });

    // Confirmation from server that we joined
    socket.on("server:joined_room", ({ roomId: joinedRoom }) => {
      console.log("✅ Confirmed joined room:", joinedRoom);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected from game:", reason);
      setIsConnected(false);

      // Handle different disconnect reasons
      if (reason === "io client disconnect") {
        console.log(
          "Client initiated disconnect - not attempting reconnection"
        );
        // Don't show error for client-initiated disconnects
      } else if (reason === "transport close") {
        console.log("Transport closed - attempting reconnection");
        handleConnectionError(new Error(`Transport closed: ${reason}`));
      } else if (reason === "io server disconnect") {
        console.log("Server initiated disconnect - attempting reconnection");
        handleConnectionError(new Error(`Server disconnect: ${reason}`));
      } else {
        console.log("Unexpected disconnect - attempting reconnection");
        handleConnectionError(new Error(`Unexpected disconnect: ${reason}`));
      }
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
      handleConnectionError(error);
    });

    // Game initialization event (for second player)
    socket.on("game:initialized", (data) => {
      console.log("🎮 Game initialized event received:", data);

      if (data.success && data.data) {
        const { roomId: newRoomId, gameState } = data.data;

        // Update room ID if different
        if (newRoomId && newRoomId !== roomId) {
          console.log("🔄 Updating room ID from", roomId, "to", newRoomId);
          // Update the room ID state
          setRoomId(newRoomId);
          // Join the new room
          socket.emit("join_game_room", { roomId: newRoomId });
        }

        // Update game state with initialized data
        if (gameState) {
          console.log("🎯 Updating game state from initialization:", {
            players: gameState.players?.length || 0,
            currentTurn: gameState.currentTurn,
            gamePhase: gameState.gamePhase,
          });

          if (gameState.players) {
            // Preserve existing names when updating from game:initialized
            setPlayers((prevPlayers) => {
              return gameState.players.map((newPlayer) => {
                const prevPlayer = prevPlayers.find(
                  (p) => p.userId === newPlayer.userId
                );

                // Preserve frontend's formatted name if backend sends generic name
                const preservedName =
                  prevPlayer &&
                  prevPlayer.name &&
                  prevPlayer.name !== "Player" &&
                  newPlayer.name === "Player"
                    ? prevPlayer.name
                    : newPlayer.name;

                console.log(
                  `🎯 Game initialized - Name for ${newPlayer.userId}:`,
                  {
                    prevName: prevPlayer?.name,
                    newName: newPlayer.name,
                    preservedName: preservedName,
                  }
                );

                return {
                  ...newPlayer,
                  name: preservedName,
                };
              });
            });

            // Track opponent card count
            const myPlayerIndex = gameState.players.findIndex(
              (p) => p.userId === user?.id
            );
            const opponentIndex = myPlayerIndex === 0 ? 1 : 0;
            const opponent = gameState.players[opponentIndex];

            if (opponent && opponent.cards) {
              setOpponentCardCount(opponent.cards.length);
            }
          }

          if (gameState.currentTurn) {
            // If turn changed, clear per-turn power-up indicators
            setCurrentTurnUserId((prev) => {
              if (prev && prev !== gameState.currentTurn) {
                setOpponentTurnPowerUp(null);
                setMyTurnPowerUp(null);
                setArmedDefense(null);
              }
              return gameState.currentTurn;
            });
          }
          if (gameState.gamePhase) setGamePhase(gameState.gamePhase);
          if (gameState.gameState) setGameState(gameState.gameState);
        }

        // Mark as no longer waiting
        setWaitingForOpponent(false);
      }
    });

    // Game state events with debouncing
    socket.on("game_state_update", (data) => {
      console.log("🔄 Game state update received:", data);

      // Clear previous timeout
      if (gameStateUpdateTimeoutRef.current) {
        clearTimeout(gameStateUpdateTimeoutRef.current);
      }

      // Debounce game state updates to prevent excessive re-renders
      gameStateUpdateTimeoutRef.current = setTimeout(() => {
        try {
          // Extract gameState from the data object
          const gameState = data.gameState || data;

          // Validate game state before processing
          validateGameState(gameState);

          if (gameState.players) {
            console.log("🔄 Updating players from backend game state:", {
              players: gameState.players.map((p) => ({
                userId: p.userId,
                name: p.name,
                username: p.username,
                firstName: p.firstName,
                lastName: p.lastName,
                hp: p.hp,
                maxHp: p.maxHp,
              })),
            });

            // Update players with detailed HP logging and validation
            setPlayers((prevPlayers) => {
              // Check if players actually changed to avoid unnecessary re-renders
              const hasChanges = gameState.players.some((newPlayer, index) => {
                const prevPlayer = prevPlayers[index];
                const prevCardsLen = Array.isArray(prevPlayer?.cards)
                  ? prevPlayer.cards.length
                  : 0;
                const newCardsLen = Array.isArray(newPlayer?.cards)
                  ? newPlayer.cards.length
                  : 0;
                return (
                  !prevPlayer ||
                  prevPlayer.hp !== newPlayer.hp ||
                  prevPlayer.name !== newPlayer.name ||
                  prevPlayer.userId !== newPlayer.userId ||
                  prevCardsLen !== newCardsLen
                );
              });

              if (!hasChanges) {
                console.log("🔄 No player changes detected, skipping update");
                return prevPlayers;
              }

              const updatedPlayers = gameState.players.map((newPlayer) => {
                const prevPlayer = prevPlayers.find(
                  (p) => p.userId === newPlayer.userId
                );

                // Log HP changes with validation
                if (prevPlayer && prevPlayer.hp !== newPlayer.hp) {
                  console.log(
                    `💥 HP Change for ${newPlayer.name}: ${prevPlayer.hp} → ${newPlayer.hp}`
                  );

                  // Validate HP values
                  if (newPlayer.hp < 0 || newPlayer.hp > newPlayer.maxHp) {
                    console.warn(
                      `⚠️ Invalid HP value for ${newPlayer.name}: ${newPlayer.hp}`
                    );
                  }
                }

                // Preserve frontend's formatted name if backend sends generic name
                const preservedName =
                  prevPlayer &&
                  prevPlayer.name &&
                  prevPlayer.name !== "Player" &&
                  newPlayer.name === "Player"
                    ? prevPlayer.name
                    : newPlayer.name;

                // Debug name preservation
                if (prevPlayer && prevPlayer.name !== newPlayer.name) {
                  console.log(`🔄 Name update for ${newPlayer.userId}:`, {
                    prevName: prevPlayer.name,
                    newName: newPlayer.name,
                    preservedName: preservedName,
                    reason:
                      prevPlayer.name !== "Player" &&
                      newPlayer.name === "Player"
                        ? "Preserved frontend name"
                        : "Using backend name",
                  });
                }

                // Ensure HP is within valid range and preserve own cards where applicable
                const validatedPlayer = {
                  ...newPlayer,
                  name: preservedName, // Use preserved name
                  hp: Math.max(
                    0,
                    Math.min(newPlayer.hp || 0, newPlayer.maxHp || 100)
                  ),
                  // Preserve cards only for the local player if backend sent an empty array
                  cards:
                    String(newPlayer.userId) === String(user?.id)
                      ? Array.isArray(newPlayer.cards) &&
                        newPlayer.cards.length > 0
                        ? newPlayer.cards
                        : prevPlayer?.cards || []
                      : newPlayer.cards || [],
                };

                return validatedPlayer;
              });
              return updatedPlayers;
            });

            // Track opponent card count for visual display
            const myPlayerIndex = gameState.players.findIndex(
              (p) => p.userId === user?.id
            );
            const opponentIndex = myPlayerIndex === 0 ? 1 : 0;
            const opponent = gameState.players[opponentIndex];

            if (opponent) {
              // If opponent has cards, use that count, otherwise maintain current count
              if (opponent.cards && opponent.cards.length > 0) {
                setOpponentCardCount(opponent.cards.length);
              }
              // If opponent cards are empty (hidden by backend), don't change the count
            }
          }
          if (gameState.currentTurn)
            setCurrentTurnUserId(gameState.currentTurn);
          if (gameState.gamePhase) setGamePhase(gameState.gamePhase);
          if (gameState.gameState) setGameState(gameState.gameState);
          if (gameState.winner) setWinner(gameState.winner);

          // Restore QuestionModal from socket if opponent refreshed during answering
          if (
            gameState.gamePhase === "answering" &&
            gameState.selectedCard &&
            gameState.currentTurn !== user?.id
          ) {
            console.log(
              "❓ Restoring question modal from socket update:",
              gameState.selectedCard
            );
            const validatedCard = validateQuestionData(gameState.selectedCard);
            if (validatedCard) {
              setOpponentQuestion(validatedCard);
              setQuestionPhase(true);
              // Load persisted deadline for timer continuity
              try {
                const stored = localStorage.getItem(
                  `questionDeadline_${roomId}`
                );
                if (stored) setQuestionDeadlineTs(Number(stored));
              } catch (e) {
                console.warn("Failed to read persisted question deadline", e);
              }
            }
          }
        } catch (error) {
          console.error("❌ Error processing game state update:", error);
          setError(`Game state error: ${error.message}`);
          // Don't throw - continue with current state
        }
      }, 100); // 100ms debounce delay
    });

    // Listen for question challenge events from the game engine
    socket.on("question_challenge", (data) => {
      console.log("🎯 Question challenge received:", data);
      console.log("🎯 Current user ID:", user?.id);
      console.log("🎯 Target player ID:", data.targetPlayerId);
      console.log("🎯 Should show question:", data.targetPlayerId === user?.id);

      if (data.targetPlayerId === user?.id) {
        // Reset any existing modal state
        resetQuestionModalState();

        // Validate and fix the card data structure
        const validatedCard = validateQuestionData(data.card);

        if (!validatedCard) {
          console.error("❌ Invalid card data received:", data.card);
          return;
        }

        console.log(
          "🎯 Setting opponent question with validated card data:",
          validatedCard
        );

        // Set the opponent's question data
        setOpponentQuestion(validatedCard);
        setGamePhase("answering");
        setQuestionPhase(true);

        // Persist a 30s absolute deadline so timer survives refresh
        const deadline = Date.now() + 30000;
        try {
          localStorage.setItem(`questionDeadline_${roomId}`, String(deadline));
        } catch (e) {
          console.warn("Failed to persist question deadline", e);
        }
        setQuestionDeadlineTs(deadline);

        console.log("❓ Question challenge activated for opponent's card");
      } else {
        console.log("🎯 Not the target player, ignoring question challenge");
      }
    });

    // Answer submission events
    socket.on("game:answer_submitted", (data) => {
      console.log("📝 Answer submitted event received:", data);

      // Prevent duplicate processing
      if (isProcessingAnswer) {
        console.log("🚫 Already processing answer, ignoring duplicate event");
        return;
      }

      // Validate data
      if (!data || !data.playerId || !data.challengerId) {
        console.error("❌ Invalid answer submission data:", data);
        return;
      }

      console.log("📝 Processing answer submission:", data);
      setIsProcessingAnswer(true);
      console.log(
        "🔍 Debug - challengerId:",
        data.challengerId,
        "user?.id:",
        user?.id
      );
      console.log(
        "🔍 Debug - Should show results modal:",
        data.challengerId === user?.id
      );

      // Don't immediately close question modal for the answerer
      // Let the QuestionModal show the result first, then auto-close after 3 seconds
      if (data.playerId === user?.id) {
        console.log(
          "✅ Answer submitted by user - QuestionModal will show result and auto-close"
        );
        // QuestionModal will handle its own closing after showing result

        // Reset processing flag after a short delay for the answerer
        setTimeout(() => {
          setIsProcessingAnswer(false);
          console.log("✅ Answer processing completed for answerer");
        }, 2000);
      }

      // Show results modal to the challenger (the one who sent the question)
      if (data.challengerId === user?.id) {
        console.log("✅ Showing results modal to challenger");

        // Get the selected card from the event data (preserved from backend)
        const selectedCard = data.selectedCard;
        const opponentPlayer = data.gameState?.players?.find(
          (p) => p.userId === data.playerId
        );

        const newResultData = {
          question: selectedCard?.question || "Question not available",
          opponentAnswer: data.answer || "Answer submitted",
          correctAnswer:
            selectedCard?.answer ||
            selectedCard?.correctAnswer ||
            "Answer not available",
          isCorrect: data.isCorrect,
          damage: data.damage,
          opponentName:
            opponentPlayer?.name || opponentPlayer?.username || "Opponent",
        };

        console.log("🔍 Setting result data:", newResultData);
        setResultData(newResultData);
        setShowResultsModal(true);
        console.log("🔍 Show results modal set to true");

        // Reset processing flag after a short delay for the challenger
        setTimeout(() => {
          setIsProcessingAnswer(false);
          console.log("✅ Answer processing completed for challenger");
        }, 2000);
      } else {
        console.log("❌ Not showing results modal - not the challenger");

        // Reset processing flag even if not showing results modal
        setTimeout(() => {
          setIsProcessingAnswer(false);
          console.log("✅ Answer processing completed (no modal shown)");
        }, 1000);
      }

      // Handle answer result - HP updates come from backend game state
      console.log("🎯 Answer result processing:", {
        isCorrect: data.isCorrect,
        damage: data.damage,
        challengerId: data.challengerId,
        playerId: data.playerId,
        currentPlayers: players.map((p) => ({
          userId: p.userId,
          name: p.name,
          hp: p.hp,
        })),
      });

      // HP updates are handled by game_state_update event from backend
      // No local HP calculation needed - backend is the source of truth
      console.log("🔄 HP updates will come from game_state_update event");

      // Turn switching is now handled by game_state_update event
      // Only reset question modal if we're not currently showing a question
      // This prevents closing the modal while showing answer results
      if (!questionPhase) {
        console.log(
          "🔄 Game state updated - no active question, resetting modal state"
        );
        // Add a delay to allow QuestionModal to show result first
        setTimeout(() => {
          resetQuestionModalState(); // Only reset question modal, keep results modal
        }, 1000);
      } else {
        console.log(
          "🔄 Game state updated - question active, keeping modal open"
        );
      }

      // Processing flag is now managed in the game:answer_submitted handler
      // No need to reset it here to avoid conflicts
    });

    // Power-up used events
    socket.on("powerup_used", (data) => {
      try {
        const { playerId: evtPlayerId, powerUpId, effect } = data || {};
        const isMe = String(evtPlayerId) === String(user?.id);
        const nameMap = {
          health_potion: isMe
            ? "You used Health Potion (+HP)"
            : "Opponent used Health Potion",
          discard_draw_5: isMe
            ? "You used Discard & Draw 5"
            : "Opponent used Discard & Draw 5",
          double_damage: isMe
            ? "Double Damage activated (x2)"
            : "Opponent activated Double Damage",
          damage_roulette: isMe
            ? `Damage Roulette rolled${
                effect?.damage ? ` (${effect.damage})` : ""
              }`
            : `Opponent used Damage Roulette${
                effect?.damage ? ` (${effect.damage})` : ""
              }`,
          hp_swap: isMe ? "You swapped HP!" : "Opponent swapped HP!",
          emoji_taunt: isMe
            ? "You sent a taunt! 😜"
            : "Opponent sent a taunt! 😜",
          mirror_shield: isMe
            ? "Mirror Shield armed!"
            : "Opponent armed Mirror Shield!",
          barrier: isMe ? "Barrier armed!" : "Opponent armed Barrier!",
          safety_net: isMe ? "Safety Net armed!" : "Opponent armed Safety Net!",
        };
        const text = nameMap[powerUpId] || "Power-up used";
        showPowerUpToast(text);

        // Set per-turn indicators
        const labelMap = {
          health_potion: "Health Potion",
          discard_draw_5: "Discard & Draw 5",
          double_damage: "Double Damage",
          damage_roulette: "Damage Roulette",
          hp_swap: "HP Swap",
          emoji_taunt: "Emoji Taunt",
          mirror_shield: "Mirror Shield",
          barrier: "Barrier",
          safety_net: "Safety Net",
        };
        const label = labelMap[powerUpId] || "Power-up";
        if (isMe) {
          setMyTurnPowerUp(label);
        } else {
          setOpponentTurnPowerUp(label);
        }
      } catch (e) {
        console.warn("Failed processing powerup_used event", e);
      }
    });

    // Private armed defense confirmation
    socket.on("powerup_armed", ({ name }) => {
      setArmedDefense(name || "Defense");
      showPowerUpToast(`${name} armed`);
    });

    // Cosmetic taunt events (no gameplay effect)
    socket.on("cosmetic:taunt", ({ playerId: evtPlayerId, durationMs }) => {
      const isOpponent = String(evtPlayerId) !== String(user?.id);
      // Show big bouncing overlay on opponent screen
      if (isOpponent) {
        setTauntImgSrc("/222.png");
        setShowTauntOverlay(true);
        setTimeout(
          () => setShowTauntOverlay(false),
          Math.min(durationMs || 3000, 5000)
        );
      }
    });

    // Game over events
    socket.on("game:game_over", (data) => {
      console.log("🏁 Game over:", data);
      setGameState("finished");
      setWinner(data.winner);

      // Update final HP values
      if (data.finalScores) {
        setPlayers((prevPlayers) =>
          prevPlayers.map((player) => ({
            ...player,
            hp: data.finalScores[player.userId] || player.hp,
          }))
        );
      }

      // Reset all modal states when game ends
      resetAllModalStates();

      console.log(`🏆 Game Over! Winner: ${data.winnerName || data.winner}`);
    });

    // Error events
    socket.on("game:error", (error) => {
      console.error("❌ Game error:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error error:", error.error);
      console.error("❌ Error details:", error.errorDetails);
      console.error("❌ Room ID:", error.roomId);
      console.error("❌ Game ID:", error.gameId);
      console.error("❌ Full error object:", JSON.stringify(error, null, 2));

      // Gracefully ignore non-critical answer submission errors that can happen
      // during timing races (e.g., "Cannot answer your own question")
      const benignMessages = new Set([
        "Cannot answer your own question",
        "Not your turn",
        "No question to answer",
      ]);
      const msg = error?.error || error?.message || "";
      if (benignMessages.has(msg)) {
        console.warn("⚠️ Ignoring benign game error:", msg);
        return;
      }

      setError(error.message || error.error || "Game error occurred");
    });
  }, [
    socketRef,
    user?.id,
    questionPhase,
    isProcessingAnswer,
    roomId,
    handleConnectionError,
    handleReconnectionSuccess,
    validateGameState,
    players,
    resetAllModalStates,
    validateQuestionData,
    showPowerUpToast,
  ]);

  // Initialize socket events
  useEffect(() => {
    handleSocketEvents();

    // Capture ref values at the beginning of the effect
    const socket = socketRef.current;
    const gameStateTimeout = gameStateUpdateTimeoutRef.current;
    const playerTimeout = playerUpdateTimeoutRef.current;

    // Cleanup function to remove all event listeners
    return () => {
      if (socket) {
        console.log("🧹 Cleaning up socket event listeners");
        // Remove all event listeners to prevent memory leaks
        socket.removeAllListeners();
      }

      // Clear debounce timeouts
      if (gameStateTimeout) {
        clearTimeout(gameStateTimeout);
      }
      if (playerTimeout) {
        clearTimeout(playerTimeout);
      }
    };
  }, [handleSocketEvents, showPowerUpToast]);

  // Join game room when component mounts
  useEffect(() => {
    if (socketRef.current && roomId && socketRef.current.connected) {
      console.log("🏠 Joining game room:", roomId);
      socketRef.current.emit("join_game_room", { roomId });
    } else if (socketRef.current && roomId && !socketRef.current.connected) {
      console.log("⏳ Socket not connected yet, waiting for connection...");
      // Wait for connection before joining room
      const handleConnect = () => {
        console.log("🏠 Socket connected, joining game room:", roomId);
        socketRef.current.emit("join_game_room", { roomId });
        socketRef.current.off("connect", handleConnect);
      };
      socketRef.current.on("connect", handleConnect);
    }
  }, [roomId]);

  // Initialize game when data is available or restore from backend on refresh
  useEffect(() => {
    const checkForGameRestore = async () => {
      console.log("🔍 Game restoration check:", {
        roomId,
        lobbyPlayersLength: lobbyPlayers.length,
        userId: user?.id,
        hasRoomId: !!roomId,
        hasLobbyPlayers: lobbyPlayers.length > 0,
        isConnected,
      });

      // Wait for socket connection if we're trying to restore
      if (roomId && (!lobbyPlayers.length || lobbyPlayers.length === 0)) {
        if (isConnected === false) {
          console.log(
            "⏳ Waiting for socket connection before restoring game state..."
          );
          return;
        }

        console.log(
          "🔄 Page refresh detected, attempting to restore game state..."
        );
        const restored = await restoreGameState(roomId);
        if (restored) {
          console.log("✅ Game state restored from backend");
          return;
        } else {
          console.log("❌ Failed to restore game state from backend");
        }
      }

      // Otherwise, initialize normally if we have lobby players
      if (lobbyPlayers.length > 0 && user?.id) {
        console.log("🎮 Initializing game with lobby players");
        initializeGame();
      }
    };

    checkForGameRestore();
  }, [
    roomId,
    lobbyPlayers.length,
    user?.id,
    initializeGame,
    restoreGameState,
    isConnected,
  ]);

  // Mobile cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup mobile-specific state when component unmounts
      if (isMobile) {
        document.body.classList.remove("modal-open");
      }
    };
  }, [isMobile]);

  // Cards are now managed by the backend game state, not locally

  // Mobile-specific state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use isModalOpen for debugging/logging if needed
  console.log("Mobile modal state:", { isMobile, isModalOpen });

  // Mobile-optimized card click handler
  const handleCardClick = useCallback(
    (card, playerIndex) => {
      console.log("🎴 Card clicked:", card, playerIndex);

      // Prevent double-clicks and processing during other operations
      if (isProcessing) {
        console.log("⏳ Click ignored - processing in progress");
        return;
      }

      // Only allow clicking on current player's cards during their turn
      if (
        playerIndex === myPlayerIndex &&
        isMyTurn &&
        gamePhase === "cardSelection"
      ) {
        // Handle question cards
        setIsProcessing(true);

        // Mobile optimization: prevent body scroll when modal opens
        if (isMobile) {
          document.body.classList.add("modal-open");
          setIsModalOpen(true);
        }

        // Show preview modal to see the question before challenging
        setPreviewCard(card);
        setShowPreviewModal(true);
        console.log("👀 Previewing card:", card);

        // Reset processing flag after a short delay
        setTimeout(
          () => {
            setIsProcessing(false);
          },
          isMobile ? 300 : 500
        ); // Shorter delay on mobile
      }
    },
    [isProcessing, myPlayerIndex, isMyTurn, gamePhase, isMobile]
  );

  // Handle submitting the challenge to opponent
  const handleSubmitChallenge = () => {
    if (!socketRef.current || !previewCard || isProcessing) return;

    console.log("🎯 Submitting challenge to opponent:", previewCard);
    console.log("🔍 Card questionData:", previewCard.questionData);
    console.log("🔍 Current players:", players);
    console.log("🔍 Opponent index:", opponentIndex);
    console.log("🔍 Target player ID:", players[opponentIndex]?.userId);

    setIsProcessing(true);

    // Store the card before clearing it
    const cardToChallenge = previewCard;

    // Ensure the card has proper questionData structure
    const cardWithQuestionData = {
      ...cardToChallenge,
      questionData: cardToChallenge.questionData || {
        _id: cardToChallenge.id,
        questionText: cardToChallenge.question,
        choices: cardToChallenge.choices || [],
        correctAnswer: cardToChallenge.correctAnswer || "",
        bloomsLevel: cardToChallenge.bloomLevel,
      },
    };

    console.log("🔍 Sending card with questionData:", cardWithQuestionData);

    const emitData = {
      roomId,
      gameId,
      playerId: user?.id,
      card: cardWithQuestionData,
      targetPlayerId: players[opponentIndex]?.userId,
    };

    console.log("📤 Emitting game:card_selected with data:", emitData);

    // Send the card selection to the server to notify the opponent
    socketRef.current.emit("game:card_selected", emitData);

    // Replace the used card with a new one
    replaceUsedCard(cardToChallenge, user?.id);

    // Close preview modal
    setShowPreviewModal(false);
    setPreviewCard(null);

    // Mobile cleanup: restore body scroll
    if (isMobile) {
      document.body.classList.remove("modal-open");
      setIsModalOpen(false);
    }

    // Backend now handles card drawing - opponent gets a card when current player uses one
    // Card counts will be updated via game_state_update events from the backend

    // Don't show the question modal to ourselves - only the opponent should see it
    // The opponent will receive the socket event and show the modal on their side
    setGamePhase("waiting"); // Change to waiting phase while opponent answers

    console.log("✅ Challenge sent to opponent! Waiting for their answer...");

    // Reset processing flag after a delay
    setTimeout(() => {
      setIsProcessing(false);
    }, 1000);
  };

  const handleAnswerSubmit = (result) => {
    console.log("📝 Answer submitted:", result);

    if (!socketRef.current || !opponentQuestion) {
      console.error("❌ Cannot submit answer: missing socket or question data");
      setError("Missing game data. Please refresh the page.");
      return;
    }

    // Validate socket connection
    if (!socketRef.current.connected) {
      console.error("❌ Socket not connected, cannot submit answer");
      setError("Connection lost. Please refresh the page.");
      return;
    }

    // Find who challenged me (the person whose turn it was before)
    const challengerId = players.find((p) => p.userId !== user?.id)?.userId;

    if (!challengerId) {
      console.error("❌ Cannot find challenger ID");
      setError("Cannot identify opponent. Please refresh the page.");
      return;
    }

    // Prevent duplicate submissions
    if (isProcessingAnswer) {
      console.warn(
        "⚠️ Answer already being processed, ignoring duplicate submission"
      );
      return;
    }

    // Set processing flag immediately to prevent duplicate submissions
    setIsProcessingAnswer(true);

    // Clear persisted deadline once an answer is submitted
    try {
      localStorage.removeItem(`questionDeadline_${roomId}`);
    } catch (e) {
      console.warn("Failed to clear question deadline", e);
    }
    setQuestionDeadlineTs(null);

    // Only set submission timeout for non-timer timeout cases
    let submissionTimeout = null;
    if (!result.isTimerTimeout) {
      submissionTimeout = setTimeout(() => {
        console.warn("⚠️ Answer submission timeout - no response received");
        setIsProcessingAnswer(false);
        setError("Answer submission timed out. Please try again.");
      }, 10000); // 10 second timeout
    } else {
      console.log(
        "⏰ Timer timeout - treating as wrong answer, no submission timeout needed"
      );
    }

    // Delay the socket emission to allow QuestionModal to show result first
    // The QuestionModal will auto-close after 3 seconds, then we send the answer
    setTimeout(() => {
      console.log("📤 Sending answer to server after modal display delay");

      try {
        socketRef.current.emit("game:submit_answer", {
          roomId,
          gameId,
          playerId: user?.id,
          challengerId: challengerId,
          card: opponentQuestion,
          answer: result.selectedAnswer,
          isCorrect: result.isCorrect,
          // Let backend calculate damage - don't send damage from frontend
        });

        console.log("✅ Answer successfully sent to server");

        // Clear the timeout since we successfully sent the answer
        if (submissionTimeout) {
          clearTimeout(submissionTimeout);
        }
      } catch (error) {
        console.error("❌ Error sending answer to server:", error);
        setError("Failed to submit answer. Please try again.");
        setIsProcessingAnswer(false);
        if (submissionTimeout) {
          clearTimeout(submissionTimeout);
        }
      }
    }, 3000); // Reduced delay to 3 seconds for better responsiveness

    // Don't close modal here - let the QuestionModal handle its own closing
    // This prevents race conditions and ensures proper state management
  };

  // handleCloseResults removed - using resetResultsModalState instead

  // Test function removed - was for debugging only

  // Memoized HP color calculation
  const getHpColor = useCallback((currentHp, maxHp) => {
    const percentage = (currentHp / maxHp) * 100;

    if (percentage >= 70) {
      // Green for high HP (70-100%)
      return "#22c55e";
    } else if (percentage >= 40) {
      // Orange for medium HP (40-69%)
      return "#f59e0b";
    } else if (percentage >= 20) {
      // Red-orange for low HP (20-39%)
      return "#f97316";
    } else {
      // Dark red for critical HP (0-19%)
      return "#dc2626";
    }
  }, []);

  // Helper function to reset question modal state only
  const resetQuestionModalState = () => {
    console.log("🔄 Resetting question modal state");
    setQuestionPhase(false);
    setOpponentQuestion(null);
    // Also reset processing flag when modal is closed
    setIsProcessingAnswer(false);
  };

  // Helper function to reset results modal state only
  const resetResultsModalState = () => {
    console.log("🔄 Resetting results modal state");
    setShowResultsModal(false);
    setResultData(null);
  };

  // Note: Card rendering is handled inline in the JSX for better performance

  // Power-ups not currently implemented

  const restart = () => {
    window.location.reload();
  };

  try {
    // Questions are now loaded by backend

    // Show waiting state if no game data
    if (waitingForOpponent || !players.length) {
      return (
        <div className="demoContainer">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100vh",
              color: "var(--text-primary)",
              textAlign: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                border: "4px solid var(--field-border)",
                borderTop: "4px solid var(--legendary-gold)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                marginBottom: "20px",
              }}
            ></div>
            <h2
              style={{ color: "var(--legendary-gold)", marginBottom: "10px" }}
            >
              Waiting for Game...
            </h2>
            <p style={{ color: "var(--text-secondary)" }}>
              {waitingForOpponent
                ? "Waiting for opponent to join..."
                : "Initializing game..."}
            </p>
            {!isConnected && (
              <p style={{ color: "#ef4444", marginTop: "10px" }}>
                Connection lost. Please refresh the page.
              </p>
            )}
          </div>
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div className="demoContainer">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100vh",
              color: "var(--text-primary)",
              textAlign: "center",
              padding: "20px",
            }}
          >
            <h2 style={{ color: "#ef4444", marginBottom: "20px" }}>
              Game Error
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "var(--legendary-gold)",
                color: "#1f2937",
                border: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="demoContainer"
        style={{ position: "relative", zIndex: 2 }}
      >
        <FloatingStars />

        {/* Power-ups Panel */}
        <PowerUpPanel
          isMobile={isMobile}
          availablePowerUpId={availablePowerUpId}
          isAvailable={isAvailable}
          onUse={usePowerUp}
        />

        {/* Power-up Toast */}
        {powerUpToast && (
          <div
            style={{
              position: "fixed",
              top: 16,
              right: 16,
              background: "rgba(17,24,39,0.9)",
              color: "var(--legendary-gold)",
              border: "1px solid var(--legendary-gold)",
              padding: "10px 14px",
              borderRadius: 10,
              zIndex: 50,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              fontWeight: 700,
            }}
          >
            {powerUpToast}
          </div>
        )}

        {/* Header */}
        <div className="gameHeader">
          <h1 className="gameTitle">
            <FaDice />
            QUIZ CARD DUEL
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "14px",
              color:
                isConnected === true
                  ? "#22c55e"
                  : isConnected === false
                  ? "#ef4444"
                  : "#f59e0b",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor:
                  isConnected === true
                    ? "#22c55e"
                    : isConnected === false
                    ? "#ef4444"
                    : "#f59e0b",
              }}
            ></div>
            {isConnected === true
              ? "Connected"
              : isConnected === false
              ? "Disconnected"
              : "Connecting..."}
            {isReconnecting && (
              <span style={{ color: "#f59e0b", marginLeft: "10px" }}>
                🔄 Reconnecting... ({reconnectAttempts}/3)
              </span>
            )}
            {connectionLost && !isReconnecting && (
              <span style={{ color: "#ef4444", marginLeft: "10px" }}>
                ⚠️ Connection Lost
              </span>
            )}
          </div>
        </div>

        {/* Test button removed - was for debugging only */}

        {/* Main Duel Field */}
        <div className="duelField">
          {/* Game Status Bar */}
          <div className="gameStatusBar">
            <div className="turnIndicator">
              <FaDice />
              {isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
            </div>
            <div className="phaseIndicator">
              {gamePhase?.toUpperCase() || "CHALLENGE"}
            </div>
          </div>

          {/* Player Areas */}
          <div className="playerZone topPlayer">
            {/* Top Player Info */}
            <div className="playerInfo opponentInfo">
              <div className="playerName">
                {players[opponentIndex]?.name ||
                  players[opponentIndex]?.username ||
                  "Opponent"}
              </div>
              <div className="playerRole">OPPONENT</div>
              {opponentTurnPowerUp && (
                <div
                  className="activePowerUpTag"
                  style={{
                    marginTop: "4px",
                    color: "#eab308",
                    fontWeight: 700,
                    fontSize: isMobile ? "10px" : "12px",
                  }}
                >
                  ⚡ {opponentTurnPowerUp}
                </div>
              )}
              <div className="playerStats">
                <div className="statItem">
                  <span className="statLabel">Correct:</span>
                  <span className="statValue">
                    {players[opponentIndex]?.correctAnswers || 0}
                  </span>
                </div>
              </div>
              <div className="hpBar">
                <div className="hpBarBackground">
                  <div
                    className="hpBarFill"
                    style={{
                      width: `${
                        ((players[opponentIndex]?.hp || 100) /
                          (players[opponentIndex]?.maxHp || 100)) *
                        100
                      }%`,
                      backgroundColor: getHpColor(
                        players[opponentIndex]?.hp || 100,
                        players[opponentIndex]?.maxHp || 100
                      ),
                    }}
                  ></div>
                </div>
                <div className="hpText">
                  {players[opponentIndex]?.hp || 100}/
                  {players[opponentIndex]?.maxHp || 100}
                </div>
              </div>
            </div>

            <div className="cardHand">
              {Array.from({ length: opponentCardCount }, (_, index) => {
                // Show face-down cards for opponent - no information visible
                return (
                  <div
                    key={`opponent-card-${index}`}
                    className="gameCard opponent face-down"
                  >
                    <div className="card-back">
                      <div className="card-back-pattern">
                        <div className="geometric-pattern">
                          <div className="pattern-line"></div>
                          <div className="pattern-diamond"></div>
                          <div className="pattern-line"></div>
                        </div>
                        <div className="card-back-text">BATTLE CARD</div>
                        <div className="card-back-subtitle">
                          Educational PvP
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Battle Zone */}
          <BattleField gamePhase={gamePhase} isMyTurn={isMyTurn} />

          {/* Current Player Area */}
          <div className="playerZone bottomPlayer">
            <div className="cardHand">
              {/* Debug: Log player and cards info */}
              {console.log("Player cards debug:", {
                myPlayerIndex,
                player: players[myPlayerIndex],
                cards: players[myPlayerIndex]?.cards,
                cardsLength: players[myPlayerIndex]?.cards?.length,
                playerName: players[myPlayerIndex]?.name,
                playerUsername: players[myPlayerIndex]?.username,
                allPlayers: players.map((p) => ({
                  userId: p.userId,
                  name: p.name,
                  username: p.username,
                })),
              })}
              {players[myPlayerIndex]?.cards?.map((card, index) => {
                // Debug: Log card data
                console.log(`Card ${index}:`, {
                  id: card.id,
                  type: card.type,
                  name: card.name,
                  description: card.description,
                  color: card.color,
                  bgColor: card.bgColor,
                  fullCard: card,
                });

                // Log the full card object to see what's actually there
                console.log(
                  `Card ${index} FULL DATA:`,
                  JSON.stringify(card, null, 2)
                );

                // Filter out invalid cards - only filter out cards without question text
                if (!card.question && !card.questionText) {
                  console.log(
                    "🚨 FRONTEND FILTERING OUT CARD WITHOUT QUESTION:",
                    {
                      id: card.id,
                      type: card.type,
                      hasQuestion: !!card.question,
                      hasQuestionText: !!card.questionText,
                      allKeys: Object.keys(card),
                    }
                  );
                  return null; // Don't render this card
                }

                // Handle empty or undefined cards
                if (!card || !card.type) {
                  console.warn(`Card ${index} is empty or undefined:`, card);
                  return (
                    <div
                      key={`empty_${index}`}
                      className="gameCard emptyCard"
                      style={{
                        borderColor: "#6b7280",
                        color: "#6b7280",
                        background: "rgba(107, 114, 128, 0.1)",
                        opacity: 0.5,
                      }}
                    >
                      <div className="cardHeader">
                        <div className="cardType">EMPTY</div>
                        <div className="cardDamage">?</div>
                      </div>
                      <div className="cardContent">
                        <div className="cardQuestion">Empty Slot</div>
                        <div className="cardDescription">No card data</div>
                      </div>
                      <div className="cardFooter">EMPTY</div>
                    </div>
                  );
                }

                // Regular question cards
                const bloomLevel =
                  card.bloom_level || card.bloomLevel || "Remembering";
                const bloomColor = `var(--bloom-${bloomLevel.toLowerCase()})`;
                const damage = card.damage || 0;

                // Get simple damage icon
                const getDamageIcon = () => {
                  return "⚔️";
                };

                return (
                  <div
                    key={card.id || index}
                    className="gameCard modernCard"
                    onClick={() => handleCardClick(card, myPlayerIndex)}
                    style={{
                      borderColor: bloomColor,
                      color: bloomColor,
                      background: `linear-gradient(135deg, ${bloomColor}15, rgba(20, 30, 40, 0.95), ${bloomColor}08)`,
                      cursor:
                        isMyTurn && gamePhase === "cardSelection"
                          ? "pointer"
                          : "default",
                      opacity:
                        isMyTurn && gamePhase === "cardSelection" ? 1 : 0.7,
                    }}
                    // Mobile-specific attributes
                    role="button"
                    tabIndex={
                      isMyTurn && gamePhase === "cardSelection" ? 0 : -1
                    }
                    aria-label={`${bloomLevel} card with ${damage} damage: ${
                      card.question ||
                      card.questionText ||
                      "Question not available"
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCardClick(card, myPlayerIndex);
                      }
                    }}
                  >
                    {/* Card Header with Damage */}
                    <div className="cardHeader">
                      <div
                        className="damageValue"
                        style={{ color: bloomColor }}
                      >
                        <span className="damageNumber">{damage}</span>
                        <span className="damageIcon">{getDamageIcon()}</span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="cardContent">
                      <div className="cardQuestion">
                        {card.question ||
                          card.questionText ||
                          "Question not available"}
                      </div>
                    </div>

                    {/* Card Footer with Bloom Level */}
                    <div className="cardFooter">
                      <div
                        className="bloomLevelText"
                        style={{ color: bloomColor }}
                      >
                        {bloomLevel.toUpperCase()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Player Info */}
            <div className="playerInfo myPlayerInfo">
              <div className="playerName">
                {players[myPlayerIndex]?.name ||
                  players[myPlayerIndex]?.username ||
                  "You"}
              </div>
              <div className="playerRole">YOU</div>
              {armedDefense && (
                <div
                  className="activePowerUpTag"
                  style={{
                    marginTop: "4px",
                    color: "#22c55e",
                    fontWeight: 700,
                    fontSize: isMobile ? "10px" : "12px",
                  }}
                >
                  🛡️ Armed: {armedDefense}
                </div>
              )}
              {myTurnPowerUp && (
                <div
                  className="activePowerUpTag"
                  style={{
                    marginTop: "4px",
                    color: "#eab308",
                    fontWeight: 700,
                    fontSize: isMobile ? "10px" : "12px",
                  }}
                >
                  ⚡ {myTurnPowerUp}
                </div>
              )}
              <div className="playerStats">
                <div className="statItem">
                  <span className="statLabel">Correct:</span>
                  <span className="statValue">
                    {players[myPlayerIndex]?.correctAnswers || 0}
                  </span>
                </div>
              </div>
              <div className="hpBar">
                <div className="hpBarBackground">
                  <div
                    className="hpBarFill"
                    style={{
                      width: `${
                        ((players[myPlayerIndex]?.hp || 100) /
                          (players[myPlayerIndex]?.maxHp || 100)) *
                        100
                      }%`,
                      backgroundColor: getHpColor(
                        players[myPlayerIndex]?.hp || 100,
                        players[myPlayerIndex]?.maxHp || 100
                      ),
                    }}
                  ></div>
                </div>
                <div className="hpText">
                  {players[myPlayerIndex]?.hp || 100}/
                  {players[myPlayerIndex]?.maxHp || 100}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Taunt Overlay */}
        {showTauntOverlay && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.25)",
              zIndex: 1000,
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            {/* Confetti layer */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
              }}
            >
              {Array.from({ length: 48 }).map((_, i) => {
                const left = Math.random() * 100;
                const delay = `${(Math.random() * 0.6).toFixed(2)}s`;
                const duration = `${(1.5 + Math.random() * 0.9).toFixed(2)}s`;
                const size = 6 + Math.random() * 8;
                const colors = [
                  "#e11d48",
                  "#f59e0b",
                  "#10b981",
                  "#3b82f6",
                  "#a855f7",
                ];
                const color = colors[i % colors.length];
                const rotate = Math.floor(Math.random() * 360);
                return (
                  <div
                    key={`confetti-${i}`}
                    style={{
                      position: "absolute",
                      top: -20,
                      left: `${left}%`,
                      width: size,
                      height: size * 0.45,
                      background: color,
                      opacity: 0.9,
                      transform: `rotate(${rotate}deg)`,
                      borderRadius: 2,
                      animation: `confetti-fall ${duration} linear ${delay} forwards`,
                    }}
                  />
                );
              })}
            </div>

            {/* Big bouncing/shaking emoji image */}
            <img
              src={tauntImgSrc}
              alt="Taunt"
              style={{
                width: isMobile ? "200px" : "340px",
                height: isMobile ? "200px" : "340px",
                animation:
                  "taunt-bounce 0.9s ease-in-out infinite, taunt-shake 0.6s ease-in-out infinite",
                filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.55))",
              }}
            />

            <style>{`
              @keyframes taunt-bounce {
                0%, 100% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-22px) scale(1.08); }
              }
              @keyframes taunt-shake {
                0% { transform: translateX(0) rotate(0deg); }
                25% { transform: translateX(-4px) rotate(-2deg); }
                50% { transform: translateX(0) rotate(2deg); }
                75% { transform: translateX(4px) rotate(-1deg); }
                100% { transform: translateX(0) rotate(0deg); }
              }
              @keyframes confetti-fall {
                0% { transform: translateY(-12vh) rotate(0deg); opacity: 1; }
                100% { transform: translateY(110vh) rotate(360deg); opacity: 0.8; }
              }
            `}</style>
          </div>
        )}

        {/* Victory Modal */}
        <VictoryModal
          winner={winner}
          onRestart={restart}
          onClose={restart}
          isVisible={gameState === "finished"}
        />

        {/* Preview Modal - Previewing Card Before Challenge */}
        {showPreviewModal && previewCard && (
          <div className="questionModalOverlay">
            <div className="questionModal">
              <div className="questionModalHeader">
                <h2 className="questionModalTitle">Preview Challenge</h2>
                <div
                  className="bloomLevel"
                  style={{
                    color: `var(--bloom-${(
                      previewCard.bloom_level ||
                      previewCard.bloomLevel ||
                      "remembering"
                    ).toLowerCase()})`,
                  }}
                >
                  {(
                    previewCard.bloom_level ||
                    previewCard.bloomLevel ||
                    "Remembering"
                  ).toUpperCase()}
                </div>
                <div
                  className="damageValue"
                  style={{
                    color: `var(--bloom-${(
                      previewCard.bloom_level ||
                      previewCard.bloomLevel ||
                      "remembering"
                    ).toLowerCase()})`,
                  }}
                >
                  {previewCard.damage || 0} DMG
                </div>
                <button
                  className="closeButton"
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewCard(null);

                    // Mobile cleanup: restore body scroll
                    if (isMobile) {
                      document.body.classList.remove("modal-open");
                      setIsModalOpen(false);
                    }
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="questionModalContent">
                <div className="questionText">{previewCard.question}</div>

                <div className="previewChoices">
                  {(
                    previewCard.questionData?.choices ||
                    previewCard.choices ||
                    []
                  ).map((choice, index) => (
                    <div key={index} className="previewChoice">
                      <span className="choiceLetter">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <span className="choiceText">{choice}</span>
                    </div>
                  ))}
                </div>

                <div className="submitSection">
                  <button
                    className="submitButton challengeButton"
                    onClick={handleSubmitChallenge}
                    style={{
                      background: `var(--bloom-${(
                        previewCard.bloom_level ||
                        previewCard.bloomLevel ||
                        "remembering"
                      ).toLowerCase()})`,
                      color: "#1f2937",
                      fontWeight: "700",
                    }}
                  >
                    🎯 Submit Challenge
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question Modal - Answering Opponent's Challenge */}
        <QuestionModal
          isOpen={
            questionPhase && opponentQuestion && opponentQuestion.questionData
          }
          onClose={() => {
            console.log("🔒 QuestionModal onClose called");
            resetQuestionModalState(); // Only reset question modal, keep results modal
            try {
              localStorage.removeItem(`questionDeadline_${roomId}`);
            } catch (e) {
              console.warn("Failed to clear question deadline on close", e);
            }
            setQuestionDeadlineTs(null);
          }}
          cardData={opponentQuestion}
          onAnswerSubmit={handleAnswerSubmit}
          playerName={players[myPlayerIndex]?.name || "Player"}
          isProcessing={isProcessingAnswer}
          deadlineTs={questionDeadlineTs}
        />

        {/* Quick Result Popup - Show Opponent's Answer and Damage */}
        <QuickResultPopup
          isVisible={showResultsModal}
          resultData={resultData}
          onClose={() => {
            console.log("🔒 QuickResultPopup onClose called");
            resetResultsModalState();
          }}
        />

        {/* Victory Modal - Show when game is over */}
        {gameState === "finished" && winner && (
          <VictoryModal
            winner={
              players.find((p) => p.userId === winner)?.name || "Unknown Player"
            }
            isWinner={winner === user?.id}
            starChange={winner === user?.id ? 8 : -8}
            onRestart={() => {
              console.log("🔄 Restarting game...");
              window.location.reload();
            }}
            onClose={() => {
              console.log("🚪 Exiting game...");
              // Navigate back to lobby or main menu
              window.history.back();
            }}
            isVisible={true}
          />
        )}
      </div>
    );
  } catch (error) {
    console.error("❌ CRITICAL ERROR IN DEMO COMPONENT RENDER:");
    console.error("- Error message:", error.message);
    console.error("- Error stack:", error.stack);
    console.error("- Component state:", {
      gameState,
      gamePhase,
      players: players?.length,
      isConnected,
    });

    return (
      <div
        className="demoContainer"
        style={{ padding: "20px", textAlign: "center" }}
      >
        <h1 style={{ color: "red" }}>Game Error!</h1>
        <p>The game encountered an error and needs to be restarted.</p>
        <p style={{ color: "#666", fontSize: "14px" }}>
          Error: {error.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: "10px 20px", marginTop: "20px" }}
        >
          Refresh Page
        </button>
      </div>
    );
  }
};

export default Demo;
