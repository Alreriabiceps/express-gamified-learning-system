import React, { useState, useEffect } from "react";
import styles from "./Crew.module.css"; // Import the CSS module
import {
  FaUserPlus,
  FaUsers,
  FaGlobeAmericas,
  FaCheckCircle,
  FaHourglassHalf,
  FaSearch,
  FaCommentDots,
} from "react-icons/fa";
import FloatingStars from "../../../components/FloatingStars/FloatingStars"; // Import FloatingStars
import useSocket from "../../../../../hooks/useSocket";
import { useNavigate, Link } from "react-router-dom"; // Import useNavigate and Link

// --- Sample Data (Replace with actual friend data/state) ---
const sampleFriendsData = {
  all: [],
  accepted: [],
  pending: [],
};
// -------------------------------------------------------------

// Helper to get initials from a user object
function getInitials(user) {
  if (!user) return "";
  const names = [user.firstName, user.lastName].filter(Boolean);
  if (names.length)
    return names
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  if (user.username) return user.username.slice(0, 2).toUpperCase();
  return "";
}

// Helper to get a color for avatar (based on username hash)
function getAvatarColor(username) {
  if (!username) return "#8884d8";
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#f59e42",
    "#3b82f6",
    "#10b981",
    "#f43f5e",
    "#6366f1",
    "#fbbf24",
    "#14b8a6",
    "#a21caf",
  ];
  return colors[Math.abs(hash) % colors.length];
}

const Crew = () => {
  const [addStudentId, setAddStudentId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'accepted', 'pending'
  const [feedback, setFeedback] = useState(null); // For success/error messages
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [acceptedFriends, setAcceptedFriends] = useState([]);
  const [loadingAccepted, setLoadingAccepted] = useState(false);
  const socketRef = useSocket();
  const currentUser = JSON.parse(localStorage.getItem("user")) || {};
  const navigate = useNavigate(); // Added for navigation

  // Debounce search term
  useEffect(() => {
    const id = setTimeout(
      () => setDebouncedSearch(searchTerm.trim().toLowerCase()),
      250
    );
    return () => clearTimeout(id);
  }, [searchTerm]);

  // Abort controllers for fetches
  const pendingAbortRef = React.useRef(null);
  const acceptedAbortRef = React.useRef(null);

  // Fetch pending requests when 'pending' tab is active
  useEffect(() => {
    if (activeTab === "pending") {
      const fetchPending = async () => {
        if (pendingAbortRef.current) pendingAbortRef.current.abort();
        const controller = new AbortController();
        pendingAbortRef.current = controller;
        setLoadingPending(true);
        setFeedback(null);
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL;
          const token = localStorage.getItem("token");
          const response = await fetch(
            `${backendUrl}/api/friend-requests/pending`,
            {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            }
          );
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "Failed to fetch pending requests");
          setPendingRequests(data.data || []);
        } catch (err) {
          if (err.name === "AbortError") return;
          setFeedback({ type: "error", message: err.message });
          setPendingRequests([]);
        } finally {
          setLoadingPending(false);
        }
      };
      fetchPending();
      return () => {
        if (pendingAbortRef.current) pendingAbortRef.current.abort();
      };
    }
  }, [activeTab]);

  // Fetch accepted friends when 'all' or 'accepted' tab is active
  useEffect(() => {
    if (activeTab === "accepted" || activeTab === "all") {
      const fetchAccepted = async () => {
        if (acceptedAbortRef.current) acceptedAbortRef.current.abort();
        const controller = new AbortController();
        acceptedAbortRef.current = controller;
        setLoadingAccepted(true);
        setFeedback(null);
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL;
          const token = localStorage.getItem("token");
          const response = await fetch(
            `${backendUrl}/api/friend-requests/friends`,
            {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            }
          );
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "Failed to fetch friends");
          setAcceptedFriends(data.data || []);
        } catch (err) {
          if (err.name === "AbortError") return;
          setFeedback({ type: "error", message: err.message });
          setAcceptedFriends([]);
        } finally {
          setLoadingAccepted(false);
        }
      };
      fetchAccepted();
      return () => {
        if (acceptedAbortRef.current) acceptedAbortRef.current.abort();
      };
    }
  }, [activeTab]);

  // Real-time updates with Socket.IO
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const onRequestReceived = ({ request }) => {
      setPendingRequests((prev) => [...prev, request]);
    };
    const onRequestSent = ({ request }) => {
      setPendingRequests((prev) => [...prev, request]);
    };
    const onRequestAccepted = ({ request }) => {
      setAcceptedFriends((prev) => [...prev, request]);
      setPendingRequests((prev) => prev.filter((r) => r._id !== request._id));
    };
    const onFriendRemoved = ({ friendId }) => {
      setAcceptedFriends((prev) => prev.filter((f) => f._id !== friendId));
    };
    const onRequestCancelled = ({ requestId }) => {
      setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
    };
    socket.on("friend:requestReceived", onRequestReceived);
    socket.on("friend:requestSent", onRequestSent);
    socket.on("friend:requestAccepted", onRequestAccepted);
    socket.on("friend:removed", onFriendRemoved);
    socket.on("friend:requestCancelled", onRequestCancelled);
    return () => {
      socket.off("friend:requestReceived", onRequestReceived);
      socket.off("friend:requestSent", onRequestSent);
      socket.off("friend:requestAccepted", onRequestAccepted);
      socket.off("friend:removed", onFriendRemoved);
      socket.off("friend:requestCancelled", onRequestCancelled);
    };
  }, [socketRef]);

  // Handler for sending friend request
  const handleSendRequest = async (e) => {
    e.preventDefault();
    setFeedback(null);
    if (!addStudentId.trim()) return;
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("token");
      const response = await fetch(`${backendUrl}/api/friend-requests/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentId: addStudentId.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send request");
      setFeedback({ type: "success", message: "Friend request sent!" });
      setAddStudentId(""); // Clear input after sending
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  // Accept a friend request
  const handleAcceptRequest = async (requestId) => {
    setFeedback(null);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("token");
      const response = await fetch(`${backendUrl}/api/friend-requests/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to accept request");
      setFeedback({ type: "success", message: "Friend request accepted!" });
      // Remove accepted request from list
      setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  // Remove a friend
  const handleRemoveFriend = async (friendId) => {
    setFeedback(null);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendUrl}/api/friend-requests/friend/${friendId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to remove friend");
      setFeedback({ type: "success", message: "Friend removed." });
      setAcceptedFriends((prev) => prev.filter((f) => f._id !== friendId));
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  // Cancel a pending request sent by the user
  const handleCancelRequest = async (requestId) => {
    setFeedback(null);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendUrl}/api/friend-requests/request/${requestId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to cancel request");
      setFeedback({ type: "success", message: "Request cancelled." });
      setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  // Function to handle navigating to the main chat page for a specific friend
  // For now, it just navigates to /student/chats.
  // Later, AllChats.jsx could be enhanced to accept a friendId via state/params.
  const handleNavigateToChat = (friend) => {
    navigate("/student/chats");
    // Optionally, you could try to pass state, but AllChats needs to handle it:
    // navigate('/student/chats', { state: { selectedFriendId: friend._id } });
  };

  const getFilteredFriends = () => {
    let friendsToDisplay = [];

    // Process acceptedFriends to ensure they are user objects
    const processedAcceptedFriends = acceptedFriends
      .map((item) => {
        // If item has requester and recipient, assume it's a friend request object
        // and we need to extract the other user.
        if (
          item.requester &&
          item.recipient &&
          item.requester._id &&
          item.recipient._id
        ) {
          const otherUser =
            item.requester._id === currentUser.id
              ? item.recipient
              : item.requester;
          // Return the other user object, ensuring it has a top-level _id for keys and actions
          return { ...otherUser, _id: otherUser._id };
        }
        // Otherwise, assume item is already a user object (or has the necessary fields at top level)
        return item;
      })
      .filter(Boolean); // Filter out any null/undefined if item structure was unexpected

    if (activeTab === "all") {
      const pendingReceived = pendingRequests
        .filter((req) => req.recipient && req.recipient._id === currentUser.id)
        .map((req) => ({
          ...req.requester, // User object of the person who sent the request
          _id: req.requester._id, // Ensure top-level _id is the user's _id
          status: "pending-received",
          requestId: req._id,
        }));

      const pendingSent = pendingRequests
        .filter((req) => req.requester && req.requester._id === currentUser.id)
        .map((req) => ({
          ...req.recipient, // User object of the person to whom request was sent
          _id: req.recipient._id, // Ensure top-level _id is the user's _id
          status: "pending-sent",
          requestId: req._id,
        }));

      // Combine processed accepted friends and all pending requests for the 'all' tab
      // Filter out duplicates that might arise if a pending request was just accepted
      // (simple check based on user ID)
      const combined = [
        ...processedAcceptedFriends,
        ...pendingReceived,
        ...pendingSent,
      ];
      const uniqueCombined = [];
      const seenUserIds = new Set();
      for (const user of combined) {
        if (user && user._id && !seenUserIds.has(user._id)) {
          uniqueCombined.push(user);
          seenUserIds.add(user._id);
        } else if (
          user &&
          !user._id &&
          user.requestId &&
          !seenUserIds.has(user.requestId)
        ) {
          // Fallback for items that might only have requestId (shouldn't happen with above processing)
          uniqueCombined.push(user);
          seenUserIds.add(user.requestId);
        }
      }
      friendsToDisplay = uniqueCombined;
    } else if (activeTab === "accepted") {
      friendsToDisplay = processedAcceptedFriends;
    } else if (activeTab === "pending") {
      friendsToDisplay = pendingRequests
        .map((req) => {
          if (req.requester._id === currentUser.id) {
            // Sent by current user
            return {
              ...req.recipient,
              _id: req.recipient._id, // Ensure top-level _id
              status: "pending-sent",
              requestId: req._id,
            };
          } else {
            // Received by current user
            return {
              ...req.requester,
              _id: req.requester._id, // Ensure top-level _id
              status: "pending-received",
              requestId: req._id,
            };
          }
        })
        .filter(Boolean);
    }

    if (debouncedSearch) {
      return friendsToDisplay.filter((friend) => {
        if (!friend) return false;
        const name = `${friend.firstName || ""} ${
          friend.lastName || ""
        }`.toLowerCase();
        const id = friend.studentId ? friend.studentId.toLowerCase() : "";
        const username = friend.username ? friend.username.toLowerCase() : "";
        return (
          name.includes(debouncedSearch) ||
          id.includes(debouncedSearch) ||
          username.includes(debouncedSearch)
        );
      });
    }
    return friendsToDisplay;
  };

  const filteredAndSortedFriends = getFilteredFriends()
    .filter((friend) => friend && (friend._id || friend.requestId)) // Ensure valid items before sort
    .sort((a, b) => {
      const nameA = `${a.firstName || ""} ${a.lastName || ""}${
        a.username || ""
      }${a.studentId || ""}`.toLowerCase();
      const nameB = `${b.firstName || ""} ${b.lastName || ""}${
        b.username || ""
      }${b.studentId || ""}`.toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

  // Simple skeleton item
  const SkeletonItem = () => (
    <li className={styles.friendItem}>
      <div className={styles.avatar} style={{ opacity: 0.4 }} />
      <div className={styles.friendInfo}>
        <div
          className={styles.friendName}
          style={{ opacity: 0.4, width: "60%" }}
        >
                   
        </div>
        <div
          className={styles.friendStudentId}
          style={{ opacity: 0.3, width: "40%" }}
        >
               
        </div>
      </div>
      <div className={styles.friendActions}>
        <div className={styles.actionButton} style={{ opacity: 0.3 }} />
      </div>
    </li>
  );

  return (
    <div className={styles.crewContainer}>
      <FloatingStars />
      <header className={styles.crewHeader}>
        <FaUsers className={styles.headerIcon} />
        <h1>My Crew</h1>
      </header>

      {/* Add Friend Section */}
      <section className={styles.addFriendSection}>
        <h2>
          <FaUserPlus /> Add to Crew
        </h2>
        <form onSubmit={handleSendRequest} className={styles.addFriendForm}>
          <input
            type="text"
            value={addStudentId}
            onChange={(e) => setAddStudentId(e.target.value)}
            placeholder="Enter Student ID to send request"
            className={styles.addFriendInput}
            aria-label="Student ID"
          />
          <button type="submit" className={styles.addFriendButton}>
            Send Request
          </button>
        </form>
      </section>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`${styles.feedbackMessage} ${
            feedback.type === "error" ? styles.error : styles.success
          }`}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
          <button
            onClick={() => setFeedback(null)}
            className={styles.closeFeedbackButton}
            aria-label="Dismiss message"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tabs & Search */}
      <div className={styles.controlsBar}>
        <div className={styles.tabs} role="tablist" aria-label="Crew tabs">
          <button
            onClick={() => setActiveTab("all")}
            className={activeTab === "all" ? styles.activeTab : ""}
            role="tab"
            aria-selected={activeTab === "all"}
          >
            All Connections
          </button>
          <button
            onClick={() => setActiveTab("accepted")}
            className={activeTab === "accepted" ? styles.activeTab : ""}
            role="tab"
            aria-selected={activeTab === "accepted"}
          >
            Crew Members ({acceptedFriends.length})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={activeTab === "pending" ? styles.activeTab : ""}
            role="tab"
            aria-selected={activeTab === "pending"}
          >
            Pending Requests ({pendingRequests.length})
          </button>
        </div>
        <div className={styles.searchBar}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search crew..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
            aria-label="Search crew"
          />
        </div>
      </div>

      {/* Friends List / Pending List */}
      <section className={styles.friendsListSection}>
        {(activeTab === "all" && loadingAccepted && loadingPending) ||
        (activeTab === "accepted" && loadingAccepted) ||
        (activeTab === "pending" && loadingPending) ? (
          <ul className={styles.friendsList}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonItem key={i} />
            ))}
          </ul>
        ) : filteredAndSortedFriends.length === 0 ? (
          <p className={styles.noFriendsMessage}>
            {activeTab === "pending"
              ? "No pending requests."
              : activeTab === "accepted"
              ? "No crew members yet. Add some!"
              : "No connections found."}
          </p>
        ) : (
          <ul className={styles.friendsList}>
            {filteredAndSortedFriends.map((friend) => (
              <li
                key={friend._id || friend.requestId}
                className={styles.friendItem}
              >
                <div
                  className={styles.avatar}
                  style={{
                    backgroundColor: getAvatarColor(
                      friend.studentId || friend.username
                    ),
                  }}
                  aria-hidden="true"
                >
                  {getInitials(friend)}
                </div>
                <div className={styles.friendInfo}>
                  <span className={styles.friendName}>
                    {friend.firstName || ""} {friend.lastName || ""}
                    {!friend.firstName &&
                      !friend.lastName &&
                      (friend.studentId || friend.username)}
                  </span>
                  <span className={styles.friendStudentId}>
                    {friend.studentId || friend.username}
                  </span>
                </div>
                <div className={styles.friendActions}>
                  {friend.status === "pending-received" ? (
                    <button
                      onClick={() => handleAcceptRequest(friend.requestId)}
                      className={`${styles.actionButton} ${styles.acceptButton}`}
                    >
                      <FaCheckCircle /> Accept
                    </button>
                  ) : friend.status === "pending-sent" ? (
                    <button
                      onClick={() => handleCancelRequest(friend.requestId)}
                      className={`${styles.actionButton} ${styles.cancelButton}`}
                    >
                      <FaHourglassHalf /> Cancel
                    </button>
                  ) : activeTab === "accepted" ||
                    (activeTab === "all" && !friend.status) ? ( // Ensure it's an accepted friend
                    <>
                      <button
                        onClick={() => handleNavigateToChat(friend)}
                        className={`${styles.actionButton} ${styles.chatButton}`}
                      >
                        <FaCommentDots /> Chat
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(friend._id)}
                        className={`${styles.actionButton} ${styles.removeButton}`}
                      >
                        Remove
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div> // End Container
  );
};

export default Crew;
