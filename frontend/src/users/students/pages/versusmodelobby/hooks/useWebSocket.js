import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import socketManager from "../../../../../shared/utils/socketManager";

const useWebSocket = (
  token,
  user,
  onMatchFound,
  onMatchReady,
  onGameStart,
  onLobbyUpdate
) => {
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  // API fetch function with authentication
  const apiFetch = useCallback(
    async (url, options = {}) => {
      const backendUrl =
        import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      const fullUrl = url.startsWith("http") ? url : `${backendUrl}${url}`;

      const defaultOptions = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };

      const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...options.headers,
        },
      };

      try {
        const response = await fetch(fullUrl, mergedOptions);
        return response;
      } catch (error) {
        console.error("API fetch error:", error);
        setError(error.message || "Network error");
        throw error;
      }
    },
    [token]
  );

  // Initialize socket connection using global socketManager
  useEffect(() => {
    if (!token || !user) {
      console.warn("Socket connection skipped - missing token or user");
      return;
    }

    const initializeSocket = async () => {
      try {
        console.log("Getting socket from global manager for lobby");
        const socket = await socketManager.getSocket();
        socketRef.current = socket;
        setWsConnected(true);
        setError(null);
        console.log("Socket obtained from manager for lobby:", socket.id);

        // Set up event handlers
        socket.on("match:found", (data) => {
          console.log("Match found event received:", data);
          if (onMatchFound) {
            onMatchFound(data);
          }
        });

        socket.on("match:ready", (data) => {
          console.log("Match ready event received:", data);
          if (onMatchReady) {
            onMatchReady(data);
          }
        });

        socket.on("game:start", (data) => {
          console.log("🎮 Game start event received:", data);
          console.log("🎮 Current user ID:", user?.id);
          console.log("🎮 Players in game:", data.players);
          if (onGameStart) {
            onGameStart(data, apiFetch);
          }
        });

        // Lobby events
        socket.on("lobby:created", (lobby) => {
          console.log("Lobby created event received:", lobby);
          if (onLobbyUpdate) {
            onLobbyUpdate("created", lobby);
          }
        });

        socket.on("lobby:updated", (lobby) => {
          console.log("Lobby updated event received:", lobby);
          if (onLobbyUpdate) {
            onLobbyUpdate("updated", lobby);
          }
        });

        socket.on("lobby:deleted", ({ lobbyId }) => {
          console.log("Lobby deleted event received:", lobbyId);
          if (onLobbyUpdate) {
            onLobbyUpdate("deleted", { lobbyId });
          }
        });
      } catch (error) {
        console.error("Failed to get socket from manager:", error);
        setWsConnected(false);
        setError("Connection failed. Please check your internet connection.");
      }
    };

    initializeSocket();

    return () => {
      console.log("Cleaning up socket connection");
      // Don't disconnect the global socket, just clear the reference
      socketRef.current = null;
    };
  }, [
    token,
    user,
    onMatchFound,
    onMatchReady,
    onGameStart,
    onLobbyUpdate,
    apiFetch,
  ]);

  // Update lobby update handler when it changes
  useEffect(() => {
    if (!socketRef.current || !onLobbyUpdate) return;

    const socket = socketRef.current;

    // Remove existing listeners
    socket.off("lobby:created");
    socket.off("lobby:updated");
    socket.off("lobby:deleted");

    // Add new listeners
    socket.on("lobby:created", (lobby) => {
      console.log("Lobby created event received:", lobby);
      onLobbyUpdate("created", lobby);
    });

    socket.on("lobby:updated", (lobby) => {
      console.log("Lobby updated event received:", lobby);
      onLobbyUpdate("updated", lobby);
    });

    socket.on("lobby:deleted", ({ lobbyId }) => {
      console.log("Lobby deleted event received:", lobbyId);
      onLobbyUpdate("deleted", { lobbyId });
    });
  }, [onLobbyUpdate]);

  return {
    wsConnected,
    error,
    setError,
    socketRef,
    apiFetch,
  };
};

export default useWebSocket;
