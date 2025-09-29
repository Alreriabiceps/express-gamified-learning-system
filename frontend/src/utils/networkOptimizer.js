// Network Optimization Utility for PvP Game
// Implements data compression, batching, and connection optimization

class NetworkOptimizer {
  constructor() {
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      compressionRatio: 0,
      averageLatency: 0,
      connectionQuality: "unknown",
    };
    this.messageQueue = [];
    this.batchSize = 5;
    this.batchDelay = 100; // ms
    this.compressionEnabled = true;
    this.connectionMonitor = null;
  }

  // Initialize network optimization
  initialize(socket) {
    this.socket = socket;
    this.setupConnectionMonitoring();
    this.setupMessageBatching();
    console.log("🌐 Network optimizer initialized");
  }

  // Setup connection quality monitoring
  setupConnectionMonitoring() {
    if (!this.socket) return;

    this.connectionMonitor = setInterval(() => {
      this.measureConnectionQuality();
    }, 5000);

    // Monitor socket events
    this.socket.on("connect", () => {
      this.metrics.connectionQuality = "excellent";
      console.log("🌐 Connection established - quality: excellent");
    });

    this.socket.on("disconnect", () => {
      this.metrics.connectionQuality = "disconnected";
      console.log("🌐 Connection lost");
    });

    this.socket.on("connect_error", () => {
      this.metrics.connectionQuality = "poor";
      console.log("🌐 Connection error - quality: poor");
    });
  }

  // Measure connection quality
  measureConnectionQuality() {
    if (!this.socket || !this.socket.connected) {
      this.metrics.connectionQuality = "disconnected";
      return;
    }

    // Simple ping test
    const startTime = Date.now();
    this.socket.emit("ping", { timestamp: startTime });

    this.socket.once("pong", (data) => {
      const latency = Date.now() - data.timestamp;
      this.metrics.averageLatency = latency;

      // Determine connection quality based on latency
      if (latency < 50) {
        this.metrics.connectionQuality = "excellent";
      } else if (latency < 100) {
        this.metrics.connectionQuality = "good";
      } else if (latency < 200) {
        this.metrics.connectionQuality = "fair";
      } else {
        this.metrics.connectionQuality = "poor";
      }
    });
  }

  // Setup message batching
  setupMessageBatching() {
    setInterval(() => {
      if (this.messageQueue.length > 0) {
        this.flushMessageQueue();
      }
    }, this.batchDelay);
  }

  // Optimize and send message
  sendMessage(event, data, options = {}) {
    const message = {
      event,
      data,
      timestamp: Date.now(),
      id: this.generateMessageId(),
    };

    // Apply compression if enabled
    if (this.compressionEnabled && options.compress !== false) {
      message.data = this.compressData(data);
    }

    // Add to queue for batching
    if (options.batch !== false) {
      this.messageQueue.push(message);

      // Flush immediately if batch is full
      if (this.messageQueue.length >= this.batchSize) {
        this.flushMessageQueue();
      }
    } else {
      // Send immediately
      this.sendImmediate(message);
    }
  }

  // Flush queued messages
  flushMessageQueue() {
    if (this.messageQueue.length === 0) return;

    const messages = this.messageQueue.splice(0, this.batchSize);

    if (messages.length === 1) {
      // Send single message
      this.sendImmediate(messages[0]);
    } else {
      // Send batched messages
      this.sendBatched(messages);
    }
  }

  // Send message immediately
  sendImmediate(message) {
    if (!this.socket || !this.socket.connected) {
      console.warn("⚠️ Cannot send message - socket not connected");
      return;
    }

    const messageSize = this.calculateMessageSize(message);
    this.socket.emit(message.event, message.data);

    this.metrics.messagesSent++;
    this.metrics.bytesSent += messageSize;

    console.log(`📤 Sent: ${message.event} (${this.formatBytes(messageSize)})`);
  }

  // Send batched messages
  sendBatched(messages) {
    if (!this.socket || !this.socket.connected) {
      console.warn("⚠️ Cannot send batched messages - socket not connected");
      return;
    }

    const batch = {
      type: "batch",
      messages: messages,
      timestamp: Date.now(),
      count: messages.length,
    };

    const batchSize = this.calculateMessageSize(batch);
    this.socket.emit("message_batch", batch);

    this.metrics.messagesSent += messages.length;
    this.metrics.bytesSent += batchSize;

    console.log(
      `📦 Sent batch: ${messages.length} messages (${this.formatBytes(
        batchSize
      )})`
    );
  }

  // Compress data using simple techniques
  compressData(data) {
    try {
      // Remove unnecessary whitespace from JSON
      const jsonString = JSON.stringify(data);
      const compressed = jsonString
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .replace(/:\s+/g, ":") // Remove spaces after colons
        .replace(/,\s+/g, ",") // Remove spaces after commas
        .trim();

      const originalSize = jsonString.length;
      const compressedSize = compressed.length;
      const ratio = ((originalSize - compressedSize) / originalSize) * 100;

      this.metrics.compressionRatio = ratio;

      return compressed;
    } catch (error) {
      console.warn("⚠️ Compression failed, sending original data:", error);
      return data;
    }
  }

  // Decompress data
  decompressData(compressedData) {
    try {
      return JSON.parse(compressedData);
    } catch (error) {
      console.warn("⚠️ Decompression failed:", error);
      return compressedData;
    }
  }

  // Calculate message size in bytes
  calculateMessageSize(message) {
    return new Blob([JSON.stringify(message)]).size;
  }

  // Generate unique message ID
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Format bytes to human readable format
  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Optimize socket events for game
  optimizeGameEvents() {
    if (!this.socket) return;

    // Batch frequent events
    const frequentEvents = [
      "game_state_update",
      "player_position",
      "card_animation",
    ];

    frequentEvents.forEach((event) => {
      this.socket.on(event, (data) => {
        this.handleOptimizedEvent(event, data);
      });
    });

    console.log("🎮 Game events optimized for performance");
  }

  // Handle optimized events
  handleOptimizedEvent(event, data) {
    // Apply event-specific optimizations
    switch (event) {
      case "game_state_update":
        this.handleGameStateUpdate(data);
        break;
      case "player_position":
        this.handlePlayerPosition(data);
        break;
      case "card_animation":
        this.handleCardAnimation(data);
        break;
      default:
        this.handleGenericEvent(event, data);
    }
  }

  // Handle game state updates with optimization
  handleGameStateUpdate(data) {
    // Only process if data has actually changed
    if (this.hasDataChanged("gameState", data)) {
      this.metrics.messagesReceived++;
      this.metrics.bytesReceived += this.calculateMessageSize(data);

      // Emit optimized event
      this.emit("optimized_game_state_update", data);
    }
  }

  // Handle player position updates
  handlePlayerPosition(data) {
    // Throttle position updates
    if (this.shouldThrottle("playerPosition", 100)) {
      this.metrics.messagesReceived++;
      this.emit("optimized_player_position", data);
    }
  }

  // Handle card animations
  handleCardAnimation(data) {
    // Batch animation updates
    this.queueAnimationUpdate(data);
  }

  // Check if data has changed
  hasDataChanged(key, newData) {
    const lastData = this.lastData || {};
    const hasChanged =
      JSON.stringify(lastData[key]) !== JSON.stringify(newData);

    if (hasChanged) {
      this.lastData = { ...this.lastData, [key]: newData };
    }

    return hasChanged;
  }

  // Throttle function
  shouldThrottle(key, interval) {
    const now = Date.now();
    const lastTime = this.lastThrottleTime || {};

    if (!lastTime[key] || now - lastTime[key] > interval) {
      this.lastThrottleTime = { ...this.lastThrottleTime, [key]: now };
      return true;
    }

    return false;
  }

  // Queue animation updates
  queueAnimationUpdate(data) {
    if (!this.animationQueue) {
      this.animationQueue = [];
    }

    this.animationQueue.push(data);

    // Process queue every 16ms (60fps)
    if (!this.animationTimer) {
      this.animationTimer = setInterval(() => {
        if (this.animationQueue.length > 0) {
          const updates = this.animationQueue.splice(0, 10); // Process up to 10 updates
          this.emit("optimized_card_animations", updates);
        }
      }, 16);
    }
  }

  // Generic event handler
  handleGenericEvent(event, data) {
    this.metrics.messagesReceived++;
    this.metrics.bytesReceived += this.calculateMessageSize(data);
    this.emit(`optimized_${event}`, data);
  }

  // Simple event emitter
  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  // Get network statistics
  getStats() {
    return {
      ...this.metrics,
      queueLength: this.messageQueue.length,
      compressionEnabled: this.compressionEnabled,
      batchSize: this.batchSize,
    };
  }

  // Generate network report
  generateReport() {
    console.log("\n📊 NETWORK OPTIMIZATION REPORT");
    console.log("===============================");
    console.log(`Messages Sent: ${this.metrics.messagesSent}`);
    console.log(`Messages Received: ${this.metrics.messagesReceived}`);
    console.log(`Bytes Sent: ${this.formatBytes(this.metrics.bytesSent)}`);
    console.log(
      `Bytes Received: ${this.formatBytes(this.metrics.bytesReceived)}`
    );
    console.log(
      `Compression Ratio: ${this.metrics.compressionRatio.toFixed(1)}%`
    );
    console.log(`Average Latency: ${this.metrics.averageLatency}ms`);
    console.log(`Connection Quality: ${this.metrics.connectionQuality}`);
    console.log(`Queue Length: ${this.messageQueue.length}`);
  }

  // Cleanup
  cleanup() {
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
    }
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
    }
    this.messageQueue = [];
    console.log("🧹 Network optimizer cleaned up");
  }
}

// Export for use
export default NetworkOptimizer;

// Development helper
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  window.NetworkOptimizer = NetworkOptimizer;
  console.log(
    "🌐 NetworkOptimizer available in console as window.NetworkOptimizer"
  );
}
