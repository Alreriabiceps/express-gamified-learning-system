import { useState, useRef, useCallback } from "react";

const useMatchmaking = (user, apiFetch, socketRef) => {
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const queueIntervalRef = useRef(null);

  // Start queue timer
  const startQueueTimer = () => {
    setQueueTime(0);
  };

  // Handle matchmaking queue
  const handleQueueMatchmaking = async (onMatchFound, onMatchReady) => {
    if (isLoadingAction || isQueueing) {
      console.log("⚠️ Already queuing or loading, ignoring request");
      return;
    }

    try {
      setIsLoadingAction(true);

      console.log("🎯 Joining matchmaking queue...");

      // Add to backend matchmaking queue
      const response = await apiFetch("/api/match/queue", {
        method: "POST",
        body: JSON.stringify({ studentId: user.id || user._id }),
      });

      console.log("📡 Matchmaking response:", {
        status: response.status,
        ok: response.ok,
        url: response.url,
      });

      const data = await response.json();
      console.log("📦 Matchmaking response data:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to join matchmaking queue");
      }

      // Check for ban status
      if (data.banned) {
        console.log("🚫 User is banned from matchmaking");
        throw new Error(
          `You are banned from matchmaking for ${data.ban.seconds} seconds`
        );
      }

      if (data.matched) {
        // Found opponent immediately - show confirm modal
        console.log("🎮 Match found immediately!", data);
        setIsQueueing(false);

        // Show confirm modal immediately
        const confirmModalData = {
          lobbyId: data.lobbyId,
          opponentName: data.opponentName || "Opponent",
        };
        console.log("🔍 Setting confirm modal data:", confirmModalData);
        onMatchFound?.(confirmModalData);

        // Also listen for socket event to ensure synchronization
        if (socketRef.current) {
          socketRef.current.off("match_found", onMatchFound);
          socketRef.current.off("match_ready", onMatchReady);
          socketRef.current.on("match_found", onMatchFound);
          socketRef.current.on("match_ready", onMatchReady);
        }
      } else {
        // Added to queue, start waiting
        console.log("⏳ Added to queue, waiting for opponent...");
        console.log("📊 Queue status:", data);

        // Double-check we're not already queuing
        if (isQueueing) {
          console.log("⚠️ Already queuing, ignoring duplicate request");
          return;
        }

        setIsQueueing(true);
        startQueueTimer();

        // Listen for match found event
        if (socketRef.current) {
          // Remove any existing listener first to prevent duplicates
          socketRef.current.off("match_found", onMatchFound);
          socketRef.current.off("match_ready", onMatchReady);
          socketRef.current.on("match_found", onMatchFound);
          socketRef.current.on("match_ready", onMatchReady);
        }
      }
    } catch (error) {
      console.error("❌ Error joining matchmaking queue:", error);
      // Clean up state on error
      setIsQueueing(false);
      setQueueTime(0);
      throw error;
    } finally {
      setIsLoadingAction(false);
    }
  };

  // Cancel matchmaking queue
  const handleCancelQueue = async () => {
    if (!isQueueing) return;

    try {
      console.log("❌ Cancelling matchmaking queue...");

      // Remove from backend matchmaking queue
      const response = await apiFetch("/api/match/cancel", {
        method: "POST",
        body: JSON.stringify({ studentId: user.id || user._id }),
      });

      if (!response.ok) {
        console.warn("Warning: Failed to remove from backend queue");
      }

      // Clean up local state
      setIsQueueing(false);
      setQueueTime(0);

      // Remove match found listener
      if (socketRef.current) {
        socketRef.current.off("match_found");
        socketRef.current.off("match_ready");
      }

      console.log("✅ Successfully cancelled matchmaking");
    } catch (error) {
      console.error("❌ Error cancelling queue:", error);
      // Still clean up local state even if backend fails
      setIsQueueing(false);
      setQueueTime(0);
    }
  };

  // Cleanup function for component unmount
  const cleanup = useCallback(() => {
    console.log("🧹 Cleaning up matchmaking state...");
    setIsQueueing(false);
    setQueueTime(0);
    setIsLoadingAction(false);

    // Clear any running timers
    if (queueIntervalRef.current) {
      clearInterval(queueIntervalRef.current);
      queueIntervalRef.current = null;
    }

    // Remove socket listeners
    if (socketRef.current) {
      socketRef.current.off("match_found");
      socketRef.current.off("match_ready");
    }
  }, [socketRef]);

  return {
    isQueueing,
    setIsQueueing,
    queueTime,
    setQueueTime,
    isLoadingAction,
    setIsLoadingAction,
    queueIntervalRef,
    handleQueueMatchmaking,
    handleCancelQueue,
    startQueueTimer,
    cleanup,
  };
};

export default useMatchmaking;
