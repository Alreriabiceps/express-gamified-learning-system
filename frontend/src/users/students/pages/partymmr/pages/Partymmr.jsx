import React, { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./PartyMMR.module.css";
import FloatingStars from "../../../components/FloatingStars/FloatingStars";
import { useAuth } from "../../../../../contexts/AuthContext";
import socketManager from "../../../../../shared/utils/socketManager";

// Function to get party size name
const getPartySizeName = (size) => {
  if (size === 2) return "Duo";
  if (size === 3) return "Trio";
  if (size === 5) return "Squad"; // Or 5-Stack
  return "Party"; // Fallback
};

const Partymmr = () => {
  const { user } = useAuth();
  const backendurl = useMemo(() => import.meta.env.VITE_BACKEND_URL, []);
  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);
  // --- State ---
  const [currentParty, setCurrentParty] = useState(null); // null or { id, name, leader, members: [{id, username}], maxSize }
  const [isLoadingAction, setIsLoadingAction] = useState(false); // For create/invite/join/leave/start
  const [activeWeeks, setActiveWeeks] = useState([]);
  const [isLoadingWeeks, setIsLoadingWeeks] = useState(false);
  const [weeksError, setWeeksError] = useState(null);
  const [startingWeekId, setStartingWeekId] = useState("");
  const [publicParties, setPublicParties] = useState([]);
  const [isLoadingParties, setIsLoadingParties] = useState(false);
  const [partySearchTerm, setPartySearchTerm] = useState("");
  const [partiesError, setPartiesError] = useState(null);

  // Socket: navigate when team test starts
  useEffect(() => {
    (async () => {
      try {
        const socket = await socketManager.getSocket();
        const handler = ({ attemptId }) => {
          if (attemptId)
            window.location.href = `/student/teamtest/${attemptId}`;
        };
        socket.on("teamtest:started", handler);
        return () => socket.off("teamtest:started", handler);
      } catch {}
    })();
  }, []);

  // Helpers to map lobby payloads
  const mapLobbyToParty = useCallback((lobby) => {
    if (!lobby) return null;
    const members = Array.isArray(lobby.players)
      ? lobby.players.map((p) => ({
          id: p._id || p,
          username:
            p.firstName || p.lastName
              ? `${p.firstName || ""}${
                  p.lastName ? " " + p.lastName : ""
                }`.trim()
              : String(p),
        }))
      : [];
    return {
      id: lobby._id,
      name: lobby.name,
      leader: lobby.hostId?._id || lobby.hostId,
      members,
      maxSize: lobby.maxPlayers || 2,
    };
  }, []);

  const mapLobbyToListItem = useCallback(
    (l) => ({
      id: l._id,
      name: l.name,
      leader:
        l.hostId && (l.hostId.firstName || l.hostId.lastName)
          ? `${l.hostId.firstName || ""}${
              l.hostId.lastName ? " " + l.hostId.lastName : ""
            }`.trim()
          : "Leader",
      maxSize: l.maxPlayers || 2,
      size: Array.isArray(l.players) ? l.players.length : 1,
      isPrivate: !!l.isPrivate,
      status: l.status,
    }),
    []
  );

  // Live lobby updates via sockets (create/update/delete)
  useEffect(() => {
    (async () => {
      try {
        const socket = await socketManager.getSocket();
        const onCreated = (lobby) => {
          if (!lobby || lobby.status !== "waiting") return;
          setPublicParties((prev) => {
            const exists = prev.some((p) => p.id === lobby._id);
            if (exists) return prev;
            return [mapLobbyToListItem(lobby), ...prev];
          });
        };
        const onUpdated = (lobby) => {
          if (!lobby) return;
          setPublicParties((prev) => {
            const next = prev.slice();
            const idx = next.findIndex((p) => p.id === lobby._id);
            const item = mapLobbyToListItem(lobby);
            // If lobby left waiting state, remove from list
            if (lobby.status !== "waiting") {
              if (idx >= 0) next.splice(idx, 1);
            } else {
              if (idx >= 0) next[idx] = item;
              else next.unshift(item);
            }
            return next;
          });
          // If this is my current party, update roster smoothly
          setCurrentParty((prev) => {
            if (!prev || prev.id !== lobby._id) return prev;
            return mapLobbyToParty(lobby);
          });
        };
        const onDeleted = ({ lobbyId }) => {
          if (!lobbyId) return;
          setPublicParties((prev) => prev.filter((p) => p.id !== lobbyId));
          setCurrentParty((prev) =>
            prev && prev.id === lobbyId ? null : prev
          );
        };
        socket.on("lobby:created", onCreated);
        socket.on("lobby:updated", onUpdated);
        socket.on("lobby:deleted", onDeleted);
        return () => {
          socket.off("lobby:created", onCreated);
          socket.off("lobby:updated", onUpdated);
          socket.off("lobby:deleted", onDeleted);
        };
      } catch {}
    })();
  }, [mapLobbyToListItem, mapLobbyToParty]);

  // Load my current lobby (party)
  const loadMyLobby = useCallback(async () => {
    try {
      const res = await fetch(`${backendurl}/api/lobby/my-lobby`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCurrentParty(mapLobbyToParty(data.data));
    } catch (e) {
      // Silent fail; show no party
      setCurrentParty(null);
    }
  }, [backendurl, authHeaders, mapLobbyToParty]);

  useEffect(() => {
    loadMyLobby();
  }, [loadMyLobby]);

  // Fetch public parties (waiting lobbies)
  useEffect(() => {
    let abort = new AbortController();
    const loadParties = async () => {
      try {
        setIsLoadingParties(true);
        setPartiesError(null);
        const res = await fetch(`${backendurl}/api/lobby`, {
          headers: authHeaders,
          signal: abort.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const lobbies = Array.isArray(data.data) ? data.data : [];
        const mapped = lobbies.map(mapLobbyToListItem);
        setPublicParties(mapped);
      } catch (e) {
        if (e.name === "AbortError") return;
        setPartiesError(e.message);
      } finally {
        setIsLoadingParties(false);
      }
    };
    loadParties();
    return () => abort.abort();
  }, [backendurl, authHeaders, mapLobbyToListItem]);

  // No public browsing filter handler
  const filteredPublicParties = publicParties.filter((party) => {
    const term = partySearchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      party.name.toLowerCase().includes(term) ||
      party.leader.toLowerCase().includes(term)
    );
  });

  // Load active weeks from backend
  useEffect(() => {
    let abort = new AbortController();
    const loadWeeks = async () => {
      try {
        setIsLoadingWeeks(true);
        setWeeksError(null);
        const res = await fetch(`${backendurl}/api/weeks/active`, {
          headers: authHeaders,
          signal: abort.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const weeks = Array.isArray(data) ? data.filter((w) => w.isActive) : [];
        setActiveWeeks(weeks);
        if (weeks.length > 0) {
          setStartingWeekId(weeks[0]._id);
        }
      } catch (e) {
        if (e.name === "AbortError") return;
        setWeeksError(e.message);
      } finally {
        setIsLoadingWeeks(false);
      }
    };
    loadWeeks();
    return () => abort.abort();
  }, [backendurl, authHeaders]);

  const handleStartTeamWeekly = useCallback(async () => {
    if (!currentParty || !startingWeekId || isLoadingAction) return;
    setIsLoadingAction(true);
    try {
      const roster = currentParty.members.map((m) => m.id);
      const res = await fetch(`${backendurl}/api/teamtest/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          weekId: startingWeekId,
          roster,
          partyId: currentParty.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to start: ${err.message || res.status}`);
        return;
      }
      const data = await res.json();
      const attemptId = data.attemptId;
      window.location.href = `/student/teamtest/${attemptId}`;
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsLoadingAction(false);
    }
  }, [currentParty, startingWeekId, isLoadingAction, backendurl, authHeaders]);

  // --- Handlers ---
  const handleCreateParty = async (size) => {
    if (isLoadingAction || currentParty) return;
    setIsLoadingAction(true);
    try {
      const name = `${user?.firstName || "Party"}'s ${getPartySizeName(size)}`;
      const res = await fetch(`${backendurl}/api/lobby`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ name, isPrivate: false, maxPlayers: size }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCurrentParty(mapLobbyToParty(data.data));
      // Refresh lobby list
      setPublicParties((prev) => prev.filter((p) => p.id !== data.data._id));
    } catch (e) {
      alert(`Failed to create party: ${e.message}`);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleLeaveParty = async () => {
    if (!currentParty || isLoadingAction) return;
    setIsLoadingAction(true);
    try {
      const res = await fetch(
        `${backendurl}/api/lobby/${currentParty.id}/leave`,
        { method: "POST", headers: authHeaders }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCurrentParty(null);
    } catch (e) {
      alert(`Failed to leave: ${e.message}`);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleJoinParty = async (partyId, isPrivate) => {
    if (currentParty || isLoadingAction) return; // Can't join if already in one or busy
    setIsLoadingAction(true);
    try {
      let body = {};
      if (isPrivate) {
        const pwd =
          window.prompt("This party is private. Enter password:") || "";
        body = { password: pwd };
      }
      const res = await fetch(`${backendurl}/api/lobby/${partyId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        const msg = data.error || data.message || `HTTP ${res.status}`;
        alert(`Failed to join: ${msg}`);
        return;
      }
      // Join succeeded; server returns lobby
      const lobby = data.data || null;
      setCurrentParty(mapLobbyToParty(lobby));
    } catch (e) {
      alert(`Failed to join: ${e.message}`);
    } finally {
      setIsLoadingAction(false);
    }
  };

  return (
    <div className={styles.partyContainer}>
      <FloatingStars />
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Party Queue</h1>
        <p className={styles.pageSubtitle}>
          Take Weekly Tests together in a party
        </p>
      </div>

      <div className={styles.actionsGrid}>
        {/* --- My Party / Create Panel --- */}
        <div className={`${styles.panel} ${styles.myPartyPanel}`}>
          <h2 className={styles.panelHeader}>
            <span className={styles.panelIcon}>🤝</span> My Party
          </h2>

          {!currentParty ? (
            // Not in a party - Show Create Options
            <div className={styles.createPartyPrompt}>
              <p className={styles.createPartyText}>
                You are not currently in a party. Create one!
              </p>
              <div className={styles.createPartyButtons}>
                <button
                  onClick={() => handleCreateParty(2)}
                  className={`${styles.gameButton} ${styles.partySizeButton}`}
                  disabled={isLoadingAction}
                >
                  Create Duo
                </button>
                <button
                  onClick={() => handleCreateParty(3)}
                  className={`${styles.gameButton} ${styles.partySizeButton}`}
                  disabled={isLoadingAction}
                >
                  Create Trio
                </button>
                <button
                  onClick={() => handleCreateParty(5)}
                  className={`${styles.gameButton} ${styles.partySizeButton}`}
                  disabled={isLoadingAction}
                >
                  Create Squad
                </button>
              </div>
            </div>
          ) : (
            // In a party - Show Party Details
            <div className={styles.partyContent}>
              <p
                className={styles.createPartyText}
                style={{ textAlign: "center", marginBottom: "15px" }}
              >
                Lobby:{" "}
                <span style={{ color: "var(--color-accent)" }}>
                  {currentParty.name}
                </span>{" "}
                ({currentParty.members.length}/{currentParty.maxSize})
              </p>
              {/* Member List */}
              <ul className={styles.memberList}>
                {currentParty.members.map((member) => (
                  <li key={member.id} className={styles.memberItem}>
                    <div className={styles.memberAvatar}>
                      {member.username.substring(0, 2)}
                    </div>
                    <span className={styles.memberUsername}>
                      {member.username}{" "}
                      {member.id === currentParty.leader ? "(Leader)" : ""}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Party Actions */}
              <div className={styles.partyActions}>
                <button
                  onClick={handleLeaveParty}
                  className={`${styles.gameButton} ${styles.leavePartyButton}`}
                  disabled={isLoadingAction}
                >
                  Leave Party
                </button>
                {/* Co-op Weekly Test Start */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginLeft: 8,
                  }}
                >
                  <select
                    className={styles.lobbySearchInput}
                    value={startingWeekId}
                    onChange={(e) => setStartingWeekId(e.target.value)}
                    disabled={isLoadingWeeks || activeWeeks.length === 0}
                    aria-label="Select weekly test"
                  >
                    {activeWeeks.map((w) => (
                      <option key={w._id} value={w._id}>
                        Week {w.weekNumber} —{" "}
                        {w.subjectId?.subject || "Subject"}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleStartTeamWeekly}
                    className={`${styles.gameButton} ${styles.startQueueButton}`}
                    disabled={
                      !startingWeekId || isLoadingAction || !currentParty
                    }
                    title="Start Co-op Weekly Test"
                  >
                    Co-op Weekly Test
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- Public Parties Panel --- */}
        <div className={`${styles.panel} ${styles.publicPartiesPanel}`}>
          <div className={styles.lobbyBrowserHeader}>
            <h3
              className={styles.panelHeader}
              style={{
                marginBottom: 0,
                borderBottom: "none",
                paddingBottom: 0,
              }}
            >
              <span className={styles.panelIcon}>🌐</span> Browse Parties
            </h3>
            <div className={styles.lobbySearchContainer}>
              <span className={styles.lobbySearchIcon}>🔍</span>
              <input
                type="text"
                value={partySearchTerm}
                onChange={(e) => setPartySearchTerm(e.target.value)}
                className={styles.lobbySearchInput}
                placeholder="Search by name or leader..."
                disabled={isLoadingParties}
              />
            </div>
          </div>
          {/* Party List Container */}
          <div className={styles.lobbyListContainer}>
            {isLoadingParties ? (
              <p className={styles.noPartiesMessage}>
                Loading public parties...
              </p>
            ) : partiesError ? (
              <p className={styles.noPartiesMessage}>
                Failed to load: {partiesError}
              </p>
            ) : filteredPublicParties.length > 0 ? (
              <ul className={styles.lobbyList}>
                {filteredPublicParties.map((party) => (
                  <li key={party.id} className={styles.partyItem}>
                    <div className="flex-grow overflow-hidden mr-4">
                      <span className={styles.partyName}>{party.name}</span>
                      <span className={styles.partyMembersInfo}>
                        Leader: {party.leader} |{" "}
                        {getPartySizeName(party.maxSize)}
                      </span>
                    </div>
                    <div className={styles.partyInfo}>
                      <span className={styles.partySize}>
                        {party.size}/{party.maxSize}
                      </span>
                      <button
                        onClick={() =>
                          handleJoinParty(party.id, party.isPrivate)
                        }
                        className={`${styles.gameButton} ${styles.joinPartyButton}`}
                        disabled={isLoadingAction || !!currentParty}
                        title={currentParty ? "Already in a party" : "Join"}
                      >
                        Join
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.noPartiesMessage}>
                {partySearchTerm
                  ? "No parties match search."
                  : "No public parties found."}
              </p>
            )}
          </div>
        </div>
      </div>
      {/* End Actions Grid */}
    </div>
  );
};

export default Partymmr;
