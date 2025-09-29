// Global Socket Connection Manager
// Prevents multiple socket connections and manages connection state

import { io } from "socket.io-client";

class SocketManager {
  constructor() {
    this.socket = null;
    this.connectionPromise = null;
    this.listeners = new Map();
  }

  // Get or create socket connection
  async getSocket() {
    if (this.socket && this.socket.connected) {
      console.log("Reusing existing socket connection");
      return this.socket;
    }

    if (this.connectionPromise) {
      console.log("Connection already in progress, waiting...");
      return this.connectionPromise;
    }

    this.connectionPromise = this.createConnection();
    return this.connectionPromise;
  }

  // Create new socket connection
  async createConnection() {
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    const token = localStorage.getItem("token");

    if (!backendUrl || !token) {
      throw new Error("Missing backend URL or authentication token");
    }

    console.log("Creating new socket connection to:", backendUrl);

    // Cleanup existing socket
    if (this.socket) {
      console.log("Cleaning up existing socket");
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    return new Promise((resolve, reject) => {
      const socket = io(backendUrl, {
        path: "/socket.io/",
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        forceNew: true,
      });

      socket.on("connect", () => {
        console.log("Socket connected successfully with ID:", socket.id);
        this.socket = socket;
        this.connectionPromise = null;
        resolve(socket);
      });

      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        this.connectionPromise = null;
        reject(error);
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        if (reason === "io client disconnect") {
          console.log("Client initiated disconnect");
        } else {
          console.log("Unexpected disconnect, will attempt reconnection");
        }
      });

      socket.on("reconnect", (attemptNumber) => {
        console.log("Socket reconnected after", attemptNumber, "attempts");
      });

      socket.on("reconnect_error", (error) => {
        console.error("Socket reconnection error:", error);
      });

      socket.on("reconnect_failed", () => {
        console.error("Socket reconnection failed after all attempts");
        this.socket = null;
        this.connectionPromise = null;
      });
    });
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      console.log("Disconnecting socket");
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionPromise = null;
  }

  // Check if socket is connected
  isConnected() {
    return this.socket && this.socket.connected;
  }

  // Get socket instance (may be null if not connected)
  getSocketInstance() {
    return this.socket;
  }
}

// Export singleton instance
export default new SocketManager();
