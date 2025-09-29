import { useState, useCallback } from "react";

const useLobbyManagement = (user, token, apiFetch, logout) => {
  const [lobbies, setLobbies] = useState([]);
  const [isLoadingLobbies, setIsLoadingLobbies] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [lobbyTimers, setLobbyTimers] = useState({});
  const [hasActiveLobby, setHasActiveLobby] = useState(false);
  const [userCreatedLobby, setUserCreatedLobby] = useState(null);
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [joinError, setJoinError] = useState(null);
  const [showJoinLobbyModal, setShowJoinLobbyModal] = useState(false);

  // Check if user has a created lobby (host or player)
  const checkUserCreatedLobby = useCallback(async () => {
    try {
      if (!token) return;
      const response = await apiFetch("/api/lobby/my-lobby", { method: "GET" });
      if (response.ok) {
        const data = await response.json();
        if (data && data.data) {
          setUserCreatedLobby(data.data);
          setHasActiveLobby(true);
        } else {
          setUserCreatedLobby(null);
          setHasActiveLobby(false);
        }
      } else if (response.status === 404) {
        setUserCreatedLobby(null);
        setHasActiveLobby(false);
      } else {
        setUserCreatedLobby(null);
        setHasActiveLobby(false);
      }
    } catch (error) {
      console.error("Error checking user created lobby:", error);
    }
  }, [token, apiFetch]);

  // Fetch lobbies
  const fetchLobbies = useCallback(async () => {
    try {
      if (!token) {
        console.error("Please log in to access this feature");
        return;
      }
      setIsLoadingLobbies(true);
      const response = await apiFetch("/api/lobby", { method: "GET" });
      const data = await response.json();
      if (response.status === 401) {
        console.error("Your session has expired. Please log in again.");
        logout();
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch lobbies");
      }
      // Ensure unique lobbies
      const uniqueLobbies = data.data.reduce((acc, current) => {
        const x = acc.find((item) => item._id === current._id);
        return x ? acc : acc.concat([current]);
      }, []);
      setLobbies(uniqueLobbies);
      const userActiveLobby = uniqueLobbies.find(
        (lobby) =>
          (lobby.hostId._id === user.id ||
            lobby.players?.some((p) => p._id === user.id)) &&
          lobby.status === "waiting" &&
          lobby.expiresAt > new Date()
      );
      setHasActiveLobby(!!userActiveLobby);
    } catch (err) {
      console.error("Error fetching lobbies:", err);
    } finally {
      setIsLoadingLobbies(false);
    }
  }, [token, user, logout, apiFetch]);

  // Create lobby
  const handleCreateLobby = async (lobbyForm) => {
    try {
      setIsLoadingAction(true);
      const response = await apiFetch("/api/lobby", {
        method: "POST",
        body: JSON.stringify({
          name: lobbyForm.name || "Open Lobby",
          isPrivate: lobbyForm.isPrivate,
          password: lobbyForm.isPrivate ? lobbyForm.password : undefined,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        console.error("Your session has expired. Please log in again.");
        logout();
        return false;
      }
      if (response.status === 400) {
        console.error(data.error || "Failed to create lobby");
        if (
          data.error ===
          "You already have an active lobby. Please wait for it to expire before creating a new one."
        ) {
          setHasActiveLobby(true);
        }
        return false;
      }
      if (!response.ok) throw new Error(data.error || "Failed to create lobby");

      setHasActiveLobby(true);
      setUserCreatedLobby(data.data);
      await fetchLobbies();
      return true;
    } catch (err) {
      console.error("Error creating lobby:", err);
      return false;
    } finally {
      setIsLoadingAction(false);
    }
  };

  // Join lobby
  const handleJoinLobby = async (lobbyId, password) => {
    try {
      setIsLoadingAction(true);
      setJoinError(null);
      const response = await apiFetch(`/api/lobby/${lobbyId}/join`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (response.status === 401) {
        if (data.error === "Invalid password") setJoinError("Invalid password");
        else {
          console.error("Your session has expired. Please log in again.");
          logout();
        }
        return false;
      }
      if (response.status === 400) {
        setJoinError(data.error || "Failed to join lobby");
        if (data.error === "You already have an active lobby")
          setHasActiveLobby(true);
        return false;
      }
      if (!response.ok) throw new Error(data.error || "Failed to join lobby");

      setShowJoinLobbyModal(false);
      await fetchLobbies();
      return true;
    } catch (err) {
      console.error("Error joining lobby:", err);
      setJoinError(
        err.message || "Failed to join lobby. Please try again later."
      );
      return false;
    } finally {
      setIsLoadingAction(false);
    }
  };

  // Delete lobby
  const handleDeleteLobby = async (lobbyId) => {
    try {
      setIsLoadingAction(true);
      const response = await apiFetch(`/api/lobby/${lobbyId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (response.status === 401) {
        console.error("Your session has expired. Please log in again.");
        logout();
        return false;
      }
      if (!response.ok) throw new Error(data.error || "Failed to delete lobby");

      setHasActiveLobby(false);
      setUserCreatedLobby(null);
      await fetchLobbies();
      return true;
    } catch (err) {
      console.error("Error deleting lobby:", err);
      return false;
    } finally {
      setIsLoadingAction(false);
    }
  };

  // Handle lobby click
  const handleJoinClick = (lobby) => {
    setSelectedLobby(lobby);
    setShowJoinLobbyModal(true);
    setJoinError(null);
  };

  // Handle lobby updates from WebSocket
  const handleLobbyUpdate = useCallback(
    (type, data) => {
      switch (type) {
        case "created":
          setLobbies((prev) => {
            const exists = prev.some((l) => l._id === data._id);
            return exists ? prev : [...prev, data];
          });
          break;
        case "updated":
          setLobbies((prev) =>
            prev.map((l) => (l._id === data._id ? { ...l, ...data } : l))
          );
          // Update userCreatedLobby if this is the user's lobby
          if (userCreatedLobby && userCreatedLobby._id === data._id) {
            console.log("🔄 Updating userCreatedLobby with new data:", data);
            setUserCreatedLobby(data);
          }
          break;
        case "deleted":
          setLobbies((prev) => prev.filter((l) => l._id !== data.lobbyId));
          break;
        default:
          break;
      }
    },
    [userCreatedLobby]
  );

  return {
    lobbies,
    setLobbies,
    isLoadingLobbies,
    isLoadingAction,
    lobbyTimers,
    setLobbyTimers,
    hasActiveLobby,
    setHasActiveLobby,
    userCreatedLobby,
    setUserCreatedLobby,
    selectedLobby,
    setSelectedLobby,
    joinError,
    setJoinError,
    showJoinLobbyModal,
    setShowJoinLobbyModal,
    fetchLobbies,
    checkUserCreatedLobby,
    handleCreateLobby,
    handleJoinLobby,
    handleDeleteLobby,
    handleJoinClick,
    handleLobbyUpdate,
  };
};

export default useLobbyManagement;
