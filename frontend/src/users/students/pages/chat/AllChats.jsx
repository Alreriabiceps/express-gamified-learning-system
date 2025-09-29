import React, { useEffect, useState, useRef } from "react";
import FloatingStars from "../../components/FloatingStars/FloatingStars";
import styles from "./AllChats.module.css"; // Import the CSS module
// import ChatModal from './ChatModal';

const EMOJIS = [
  "😀",
  "😂",
  "😍",
  "👍",
  "🎉",
  "😎",
  "😭",
  "🔥",
  "🥳",
  "😅",
  "😇",
  "🤔",
  "😡",
  "😱",
  "🙌",
  "🙏",
  "💯",
  "😏",
  "😴",
  "🤩",
];

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AllChats({ currentUser, socketRef }) {
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [friendSearchTerm, setFriendSearchTerm] = useState("");
  const [debouncedFriendSearch, setDebouncedFriendSearch] = useState("");
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 480);
  const [showChatAreaMobile, setShowChatAreaMobile] = useState(false);
  const friendsAbortRef = useRef(null);
  const [friendsReload, setFriendsReload] = useState(0);

  // Removed theme object, styles are now in AllChats.module.css

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 480);
      if (window.innerWidth > 480) {
        setShowChatAreaMobile(false); // Reset on wider screens
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchFriends = async () => {
      if (friendsAbortRef.current) friendsAbortRef.current.abort();
      const controller = new AbortController();
      friendsAbortRef.current = controller;
      setFriendsLoading(true);
      setFriendsError(null);
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
        const normalized = (data.data || []).map((f) =>
          f.requester._id === currentUser.id ? f.recipient : f.requester
        );
        setFriends(normalized);
      } catch (err) {
        if (err.name === "AbortError") return;
        setFriendsError(err.message);
        setFriends([]);
      } finally {
        setFriendsLoading(false);
      }
    };
    if (currentUser?.id) fetchFriends();
    return () => {
      if (friendsAbortRef.current) friendsAbortRef.current.abort();
    };
  }, [currentUser?.id, friendsReload]);

  // Debounce sidebar friend search
  useEffect(() => {
    const id = setTimeout(
      () => setDebouncedFriendSearch(friendSearchTerm.trim().toLowerCase()),
      250
    );
    return () => clearTimeout(id);
  }, [friendSearchTerm]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const handler = ({ message }) => {
      if (
        !selectedFriend ||
        message.sender._id !== selectedFriend._id ||
        (isMobileView && !showChatAreaMobile)
      ) {
        setUnreadCounts((prev) => ({
          ...prev,
          [message.sender._id]: (prev[message.sender._id] || 0) + 1,
        }));
      }
    };
    socket.on("chat:message", handler);
    return () => socket.off("chat:message", handler);
  }, [selectedFriend, socketRef, isMobileView, showChatAreaMobile]);

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    setUnreadCounts((prev) => ({ ...prev, [friend._id]: 0 }));
    if (isMobileView) {
      setShowChatAreaMobile(true);
    }
  };

  const handleCloseChatMobile = () => {
    setShowChatAreaMobile(false);
    setSelectedFriend(null); // Optionally deselect friend when closing chat on mobile
  };

  const getInitials = (user) => {
    if (!user) return "";
    const names = [user.firstName, user.lastName].filter(Boolean);
    if (names.length)
      return names
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    if (user.username) return user.username.slice(0, 2).toUpperCase();
    return "??";
  };

  const filteredFriends = friends.filter((friend) => {
    const name = (
      (friend.firstName || "") +
      " " +
      (friend.lastName || "")
    ).toLowerCase();
    const studentId = friend.studentId?.toLowerCase() || "";
    if (!debouncedFriendSearch) return true;
    return (
      name.includes(debouncedFriendSearch) ||
      studentId.includes(debouncedFriendSearch)
    );
  });

  const sidebarClasses = `
    ${styles.sidebar}
    ${isMobileView && showChatAreaMobile ? styles.sidebarHiddenMobile : ""}
  `;

  const chatAreaClasses = `
    ${styles.chatArea}
    ${isMobileView && !showChatAreaMobile ? styles.chatAreaHiddenMobile : ""}
    ${isMobileView && showChatAreaMobile ? styles.chatAreaFullScreenMobile : ""}
  `;

  const unreadTotal = Object.values(unreadCounts).reduce(
    (sum, n) => sum + (n || 0),
    0
  );

  return (
    <div className={styles.allChatsContainer}>
      <FloatingStars />
      {/* Sidebar - Friends List Panel */}
      {(!isMobileView || !showChatAreaMobile) && (
        <div className={sidebarClasses}>
          <div className={styles.sidebarHeader}>
            CHATS
            {unreadTotal > 0 && (
              <span className={styles.unreadTotalBadge}>{unreadTotal}</span>
            )}
          </div>
          <div className={styles.friendSearchContainer}>
            <input
              type="text"
              placeholder="Search friends..."
              value={friendSearchTerm}
              onChange={(e) => setFriendSearchTerm(e.target.value)}
              className={styles.friendSearchInput}
              aria-label="Search friends"
            />
          </div>
          <div className={styles.friendList}>
            {friendsLoading ? (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`${styles.friendItem} ${styles.friendItemSkeleton}`}
                  >
                    <div className={styles.friendItemAvatar} />
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
                  </div>
                ))}
              </>
            ) : friendsError ? (
              <div className={styles.noFriendsMessage} role="alert">
                {friendsError}
                <div>
                  <button
                    className={styles.retryButton}
                    onClick={() => setFriendsReload((v) => v + 1)}
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className={styles.noFriendsMessage}>
                {friends.length === 0
                  ? "No friends yet."
                  : "No friends match your search."}
              </div>
            ) : (
              filteredFriends.map((friend) => {
                const isSelected =
                  selectedFriend && selectedFriend._id === friend._id;
                return (
                  <div
                    key={friend._id}
                    onClick={() => handleSelectFriend(friend)}
                    className={`${styles.friendItem} ${
                      isSelected ? styles.friendItemSelected : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        handleSelectFriend(friend);
                    }}
                  >
                    <div
                      className={`${styles.friendItemAvatar} ${
                        isSelected
                          ? styles.friendItemAvatarSelected
                          : styles.friendItemAvatarUnselected
                      }`}
                    >
                      {getInitials(friend)}
                    </div>
                    <div className={styles.friendInfo}>
                      <div className={styles.friendName}>
                        {friend.firstName || friend.lastName
                          ? `${friend.firstName || ""} ${
                              friend.lastName || ""
                            }`.trim()
                          : friend.studentId}
                      </div>
                      <div
                        className={`${styles.friendStudentId} ${
                          isSelected ? styles.friendStudentIdSelected : ""
                        }`}
                      >
                        {friend.studentId}
                      </div>
                    </div>
                    {unreadCounts[friend._id] > 0 && (
                      <span className={styles.unreadBadge}>
                        {unreadCounts[friend._id]}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area Panel */}
      {(!isMobileView || showChatAreaMobile) && (
        <div className={chatAreaClasses}>
          {selectedFriend ? (
            <>
              {/* Chat Header */}
              <div className={styles.chatPanelHeader}>
                {isMobileView && (
                  <button
                    onClick={handleCloseChatMobile}
                    className={styles.backButtonMobile}
                  >
                    &larr; {/* Left arrow */}
                  </button>
                )}
                <div className={styles.chatPanelAvatar}>
                  {getInitials(selectedFriend)}
                </div>
                <div>
                  <div className={styles.chatPanelFriendName}>
                    {selectedFriend.firstName || selectedFriend.lastName
                      ? `${selectedFriend.firstName || ""} ${
                          selectedFriend.lastName || ""
                        }`.trim()
                      : selectedFriend.studentId}
                  </div>
                </div>
              </div>
              {/* ChatPanel messages and input */}
              <ChatPanel
                key={selectedFriend._id}
                friend={selectedFriend}
                currentUser={currentUser}
                socketRef={socketRef}
              />
            </>
          ) : (
            !isMobileView && (
              <div className={styles.chatAreaPlaceholder}>
                <span className={styles.chatAreaPlaceholderIcon}>💬</span>
                <p className={styles.chatAreaPlaceholderText}>
                  Select a friend to start chatting.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ChatPanel adapted for this page structure
function ChatPanel({ friend, currentUser, socketRef }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    if (!friend?._id) return;
    setLoading(true);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/messages/${friend._id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [friend?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const messageHandler = ({ message }) => {
      if (
        message.sender._id === friend._id ||
        message.recipient._id === friend._id
      ) {
        setMessages((prev) => [...prev, message]);
        if (message.sender._id === friend._id && document.hasFocus()) {
          socket.emit("chat:read", {
            messageId: message._id,
            friendId: currentUser.id,
          });
        }
      }
    };

    const typingHandler = ({ from }) => {
      if (from === friend._id) {
        setIsTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
      }
    };

    const stopTypingHandler = ({ from }) => {
      if (from === friend._id) {
        setIsTyping(false);
        clearTimeout(typingTimeoutRef.current);
      }
    };

    const deliveredHandler = ({ message }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === message._id ? message : m))
      );
    };
    const readHandler = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, readAt: new Date().toISOString() } : m
        )
      );
    };

    socket.on("chat:message", messageHandler);
    socket.on("chat:typing", typingHandler);
    socket.on("chat:stop_typing", stopTypingHandler);
    socket.on("chat:delivered", deliveredHandler);
    socket.on("chat:read", readHandler);

    return () => {
      socket.off("chat:message", messageHandler);
      socket.off("chat:typing", typingHandler);
      socket.off("chat:stop_typing", stopTypingHandler);
      socket.off("chat:delivered", deliveredHandler);
      socket.off("chat:read", readHandler);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [friend?._id, currentUser.id, socketRef]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const messageData = {
      _id: tempId,
      sender: currentUser,
      recipient: friend,
      text: input,
      createdAt: new Date().toISOString(),
      isSending: true, // For optimistic UI
    };
    setMessages((prev) => [...prev, messageData]);
    setInput("");
    setShowEmoji(false);
    socketRef.current.emit("chat:stop_typing", { to: friend._id });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            recipientId: friend._id,
            text: messageData.text,
          }),
        }
      );
      const savedMessage = await response.json();
      if (response.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === tempId ? { ...savedMessage.data, isSending: false } : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === tempId
              ? { ...m, isSending: false, error: true, status: "Failed" }
              : m
          )
        );
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === tempId
            ? { ...m, isSending: false, error: true, status: "Failed" }
            : m
        )
      );
    }
  };

  const insertEmoji = (emoji) => {
    setInput((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  let lastTypingEventTime = 0;
  const TYPING_EMIT_INTERVAL = 2000; // Emit typing event at most every 2 seconds

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const now = Date.now();
    if (socketRef.current && now - lastTypingEventTime > TYPING_EMIT_INTERVAL) {
      socketRef.current.emit("chat:typing", { to: friend._id });
      lastTypingEventTime = now;
    }
  };

  return (
    <>
      <div className={styles.messagesContainer}>
        {loading && (
          <div className={styles.loadingMessages}>Loading messages...</div>
        )}
        {messages.map((msg, index) => {
          const isSender = msg.sender._id === currentUser.id;
          let statusText = "";
          if (isSender) {
            if (msg.isSending) statusText = "Sending...";
            else if (msg.error) statusText = msg.status || "Failed";
            else if (msg.readAt) statusText = `Read ${formatTime(msg.readAt)}`;
            else if (msg.deliveredAt) statusText = `Delivered`;
            else statusText = "Sent";
          }
          return (
            <div
              key={msg._id || index}
              className={`${styles.messageBubble} ${
                isSender ? styles.messageSent : styles.messageReceived
              }`}
            >
              {msg.text}
              <div className={styles.messageInfo}>
                {formatTime(msg.createdAt)} {isSender && ` - ${statusText}`}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      {isTyping && (
        <div className={styles.typingIndicator}>
          {friend.firstName || friend.studentId} is typing...
        </div>
      )}
      <form onSubmit={handleSend} className={styles.chatInputArea}>
        <button
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          className={styles.emojiButton}
        >
          😀
        </button>
        {showEmoji && (
          <div className={styles.emojiPickerContainer}>
            {EMOJIS.map((emoji) => (
              <span
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className={styles.emojiCell}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          placeholder="Type a message..."
          className={styles.chatInput}
          rows={1}
        />
        <button type="submit" className={styles.sendButton}>
          ➤
        </button>
      </form>
    </>
  );
}
