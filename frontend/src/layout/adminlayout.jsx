import React, { useState, useRef, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SideMenu from "../components/SideMenu";
import { useGuideMode } from "../contexts/GuideModeContext";
import botLogo from "/BOT.jpg";
import {
  MdSend,
  MdClose,
  MdMinimize,
  MdExpandLess,
  MdExpandMore,
  MdChat,
  MdSmartToy,
  MdMoreVert,
} from "react-icons/md";
import "../components/Chatbot.css";
import {
  ADMIN_KNOWLEDGE_BASE,
  getContextualHelp,
  generateContextualResponse,
} from "../components/AdminBotKnowledge";

const AdminLayout = () => {
  const { guideMode, setGuideMode } = useGuideMode();
  const location = useLocation();

  // Chatbot state
  const [showChatbot, setShowChatbot] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      sender: "alreria",
      text: "Hello! I'm Alreria, your AI assistant for the GLEAS admin system. I can help you with questions, students, analytics, and all admin features. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  // Enhanced response generation with context awareness
  const generateEnhancedPrompt = (question, currentPath) => {
    const context = getContextualHelp(currentPath);
    const contextualData = generateContextualResponse(question, currentPath);

    const systemPrompt = `You are Alreria, an expert AI assistant for the GLEAS (Gamified Learning Environment and Assessment System) admin panel. 

SYSTEM CONTEXT:
- Current page context: ${context}
- System: ${ADMIN_KNOWLEDGE_BASE.system.name} v${
      ADMIN_KNOWLEDGE_BASE.system.version
    }
- Available features: ${ADMIN_KNOWLEDGE_BASE.system.features.join(", ")}

CURRENT PAGE KNOWLEDGE:
${JSON.stringify(contextualData.knowledge, null, 2)}

RESPONSE GUIDELINES:
1. Be specific and accurate about GLEAS admin features
2. Provide step-by-step instructions when explaining processes
3. Reference specific UI elements, buttons, and navigation paths
4. Include relevant validation rules and requirements
5. Suggest related features or next steps
6. Be helpful but concise
7. If unsure about something, ask for clarification
8. Always maintain a friendly, professional tone

QUESTION: ${question}

RESPONSE:`;

    return systemPrompt;
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      sender: "admin",
      text: chatInput,
      timestamp: new Date(),
    };
    setChatHistory((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Generate enhanced prompt with context
      const enhancedPrompt = generateEnhancedPrompt(
        chatInput,
        location.pathname
      );

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin-chatbot`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: enhancedPrompt,
            originalQuestion: chatInput,
            currentPath: location.pathname,
          }),
        }
      );
      const data = await res.json();

      // Simulate typing delay for better UX
      setTimeout(() => {
        setChatHistory((prev) => [
          ...prev,
          {
            sender: "alreria",
            text:
              data.answer ||
              "I apologize, but I couldn't generate a response. Please try rephrasing your question.",
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
        setIsLoading(false);
      }, 1000 + Math.random() * 1000);
    } catch (err) {
      console.error("Chatbot error:", err);
      setTimeout(() => {
        setChatHistory((prev) => [
          ...prev,
          {
            sender: "alreria",
            text: "I'm experiencing technical difficulties. Please try again in a moment, or contact support if the issue persists.",
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
        setIsLoading(false);
      }, 1000);
    }
  };

  const clearChat = () => {
    setChatHistory([
      {
        sender: "alreria",
        text: "Hello! I'm Alreria, your AI assistant for the GLEAS admin system. I can help you with questions, students, analytics, and all admin features. What would you like to know?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
      <SideMenu />
      <div className="drawer-content flex flex-col">
        {/* Guide Mode Toggle */}
        <div className="flex items-center justify-end p-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="font-medium text-primary">Guide Mode</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={guideMode}
              onChange={() => setGuideMode((prev) => !prev)}
            />
          </label>
        </div>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
        {/* Modern Chatbot Widget */}
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
          {showChatbot ? (
            <div
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${
                minimized
                  ? "w-80 h-16"
                  : "w-96 h-[500px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]"
              }`}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-2xl cursor-pointer select-none"
                onClick={() => setMinimized(!minimized)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={botLogo}
                      alt="Alreria"
                      className="w-10 h-10 rounded-full border-2 border-white shadow-lg"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Alreria</h3>
                    <p className="text-purple-100 text-xs">AI Assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearChat();
                    }}
                    title="Clear chat"
                  >
                    <MdMoreVert className="w-5 h-5 text-white" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMinimized(!minimized);
                    }}
                    title={minimized ? "Expand" : "Minimize"}
                  >
                    {minimized ? (
                      <MdExpandMore className="w-5 h-5 text-white" />
                    ) : (
                      <MdExpandLess className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <button
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowChatbot(false);
                      setMinimized(false);
                    }}
                    title="Close"
                  >
                    <MdClose className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Chat Body */}
              {!minimized && (
                <>
                  <div
                    ref={chatContainerRef}
                    className="flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto bg-gray-50 dark:bg-gray-900 chatbot-scrollbar chatbot-mobile-optimized"
                    style={{ height: "calc(100% - 140px)" }}
                  >
                    {chatHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${
                          msg.sender === "admin"
                            ? "justify-end"
                            : "justify-start"
                        } group chatbot-message`}
                      >
                        <div
                          className={`flex items-end gap-2 max-w-[80%] ${
                            msg.sender === "admin"
                              ? "flex-row-reverse"
                              : "flex-row"
                          }`}
                        >
                          {msg.sender === "alreria" && (
                            <img
                              src={botLogo}
                              alt="Alreria"
                              className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-700 flex-shrink-0"
                            />
                          )}
                          <div
                            className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                              msg.sender === "admin"
                                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md"
                                : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {msg.text}
                            </p>
                            <div
                              className={`text-xs mt-1 opacity-70 ${
                                msg.sender === "admin"
                                  ? "text-blue-100"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {msg.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          {msg.sender === "admin" && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                              A
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Typing Indicator */}
                    {isTyping && (
                      <div className="flex justify-start group">
                        <div className="flex items-end gap-2">
                          <img
                            src={botLogo}
                            alt="Alreria"
                            className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-700 flex-shrink-0"
                          />
                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Ask me anything about the admin system..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendChat();
                            }
                          }}
                          disabled={isLoading}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 chatbot-focus chatbot-transition"
                          autoFocus
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <MdChat className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                      <button
                        onClick={handleSendChat}
                        disabled={isLoading || !chatInput.trim()}
                        className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none disabled:cursor-not-allowed touch-manipulation chatbot-button-hover chatbot-transition"
                      >
                        <MdSend className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                      Press Enter to send, Shift+Enter for new line
                    </p>

                    {/* Quick Action Buttons */}
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Quick Actions:
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() =>
                            setChatInput("How do I add questions?")
                          }
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          Add Questions
                        </button>
                        <button
                          onClick={() => setChatInput("How do I add students?")}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          Add Students
                        </button>
                        <button
                          onClick={() =>
                            setChatInput("How do I use AI generation?")
                          }
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          AI Generation
                        </button>
                        <button
                          onClick={() =>
                            setChatInput("Show me analytics features")
                          }
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          Analytics
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowChatbot(true)}
              className="group relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-300 touch-manipulation chatbot-button-hover chatbot-pulse-glow"
              aria-label="Open Alreria chatbot"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 animate-pulse opacity-75"></div>
              <div className="relative flex items-center justify-center">
                <img
                  src={botLogo}
                  alt="Alreria"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white shadow-lg group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
