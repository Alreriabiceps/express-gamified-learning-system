// Load Testing Utility for PvP Game
// Simulates multiple concurrent players to test performance

class LoadTester {
  constructor() {
    this.connections = [];
    this.metrics = {
      totalConnections: 0,
      successfulConnections: 0,
      failedConnections: 0,
      averageResponseTime: 0,
      memoryUsage: [],
      renderTimes: [],
      socketEvents: 0,
      errors: [],
    };
    this.isRunning = false;
  }

  // Simulate multiple players connecting
  async simulatePlayers(count = 10) {
    console.log(`🧪 Starting load test with ${count} simulated players...`);
    this.isRunning = true;
    this.metrics.totalConnections = count;

    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(this.simulatePlayer(i));
    }

    try {
      await Promise.all(promises);
      this.generateReport();
    } catch (error) {
      console.error("❌ Load test failed:", error);
      this.metrics.errors.push(error.message);
    }
  }

  // Simulate a single player
  async simulatePlayer(playerId) {
    const startTime = Date.now();

    try {
      // Simulate socket connection
      const mockSocket = {
        id: `player_${playerId}`,
        connected: true,
        emit: (event, data) => {
          this.metrics.socketEvents++;
          console.log(`📡 Player ${playerId} emitted: ${event}`);
        },
        on: (event, callback) => {
          // Simulate receiving events
          if (event === "connect") {
            setTimeout(() => callback(), Math.random() * 100);
          }
        },
      };

      // Simulate game actions
      await this.simulateGameActions(playerId, mockSocket);

      const responseTime = Date.now() - startTime;
      this.metrics.renderTimes.push(responseTime);
      this.metrics.successfulConnections++;

      console.log(`✅ Player ${playerId} completed (${responseTime}ms)`);
    } catch (error) {
      this.metrics.failedConnections++;
      this.metrics.errors.push(`Player ${playerId}: ${error.message}`);
      console.error(`❌ Player ${playerId} failed:`, error);
    }
  }

  // Simulate game actions
  async simulateGameActions(playerId, socket) {
    const actions = [
      "join_lobby",
      "create_game",
      "join_game",
      "select_card",
      "submit_answer",
      "game_state_update",
    ];

    for (const action of actions) {
      await this.simulateAction(playerId, socket, action);
      // Add random delay to simulate real user behavior
      await this.delay(Math.random() * 200);
    }
  }

  // Simulate a single action
  async simulateAction(playerId, socket, action) {
    const startTime = performance.now();

    // Simulate action processing
    socket.emit(action, {
      playerId,
      timestamp: Date.now(),
      data: this.generateMockData(action),
    });

    // Simulate processing time
    await this.delay(Math.random() * 50);

    const processingTime = performance.now() - startTime;
    this.metrics.renderTimes.push(processingTime);
  }

  // Generate mock data for actions
  generateMockData(action) {
    const mockData = {
      join_lobby: { lobbyId: "test_lobby" },
      create_game: { gameId: "test_game" },
      join_game: { roomId: "test_room" },
      select_card: { cardId: "card_123", type: "question" },
      submit_answer: { answer: "A", isCorrect: true },
      game_state_update: {
        players: [
          { userId: "player1", hp: 100, name: "Player 1" },
          { userId: "player2", hp: 80, name: "Player 2" },
        ],
      },
    };
    return mockData[action] || {};
  }

  // Utility delay function
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Generate performance report
  generateReport() {
    const avgResponseTime =
      this.metrics.renderTimes.reduce((a, b) => a + b, 0) /
      this.metrics.renderTimes.length;
    const successRate =
      (this.metrics.successfulConnections / this.metrics.totalConnections) *
      100;

    console.log("\n📊 LOAD TEST REPORT");
    console.log("==================");
    console.log(`Total Players: ${this.metrics.totalConnections}`);
    console.log(
      `Successful: ${this.metrics.successfulConnections} (${successRate.toFixed(
        1
      )}%)`
    );
    console.log(`Failed: ${this.metrics.failedConnections}`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Socket Events: ${this.metrics.socketEvents}`);
    console.log(`Errors: ${this.metrics.errors.length}`);

    if (this.metrics.errors.length > 0) {
      console.log("\n❌ Errors:");
      this.metrics.errors.forEach((error) => console.log(`  - ${error}`));
    }

    // Performance recommendations
    this.generateRecommendations(avgResponseTime, successRate);
  }

  // Generate performance recommendations
  generateRecommendations(avgResponseTime, successRate) {
    console.log("\n💡 PERFORMANCE RECOMMENDATIONS");
    console.log("===============================");

    if (avgResponseTime > 100) {
      console.log(
        "⚠️  High response time detected - consider optimizing state updates"
      );
    }

    if (successRate < 95) {
      console.log(
        "⚠️  Low success rate - check error handling and connection stability"
      );
    }

    if (this.metrics.socketEvents > this.metrics.totalConnections * 10) {
      console.log(
        "⚠️  High socket event count - consider debouncing or batching events"
      );
    }

    console.log("✅ Load test completed successfully!");
  }

  // Memory usage monitoring
  startMemoryMonitoring() {
    if (typeof performance !== "undefined" && performance.memory) {
      setInterval(() => {
        const memory = performance.memory;
        this.metrics.memoryUsage.push({
          timestamp: Date.now(),
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        });
      }, 1000);
    }
  }

  // Cleanup
  cleanup() {
    this.isRunning = false;
    this.connections = [];
    console.log("🧹 Load tester cleaned up");
  }
}

// Export for use in development
export default LoadTester;

// Development helper - add to window for console access
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  window.LoadTester = LoadTester;
  console.log("🧪 LoadTester available in console as window.LoadTester");
}
