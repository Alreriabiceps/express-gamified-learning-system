// Memory Profiling Utility for PvP Game
// Monitors memory usage, detects leaks, and provides optimization recommendations

class MemoryProfiler {
  constructor() {
    this.metrics = {
      snapshots: [],
      leaks: [],
      recommendations: [],
      baseline: null,
      current: null,
    };
    this.isMonitoring = false;
    this.intervalId = null;
    this.leakThreshold = 10 * 1024 * 1024; // 10MB threshold
    this.maxSnapshots = 100;
  }

  // Start memory monitoring
  startMonitoring(intervalMs = 5000) {
    if (this.isMonitoring) {
      console.warn("⚠️ Memory profiler is already running");
      return;
    }

    console.log("🔍 Starting memory profiling...");
    this.isMonitoring = true;

    // Take baseline snapshot
    this.takeSnapshot("baseline");
    this.metrics.baseline = this.getCurrentMemoryUsage();

    // Start monitoring interval
    this.intervalId = setInterval(() => {
      this.takeSnapshot("monitoring");
      this.analyzeMemoryUsage();
    }, intervalMs);
  }

  // Stop memory monitoring
  stopMonitoring() {
    if (!this.isMonitoring) {
      console.warn("⚠️ Memory profiler is not running");
      return;
    }

    console.log("🛑 Stopping memory profiling...");
    this.isMonitoring = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Take final snapshot
    this.takeSnapshot("final");
    this.generateReport();
  }

  // Take a memory snapshot
  takeSnapshot(label) {
    const memory = this.getCurrentMemoryUsage();
    const snapshot = {
      label,
      timestamp: Date.now(),
      memory,
      domNodes: this.countDOMNodes(),
      eventListeners: this.countEventListeners(),
      timers: this.countTimers(),
    };

    this.metrics.snapshots.push(snapshot);
    this.metrics.current = memory;

    // Keep only recent snapshots
    if (this.metrics.snapshots.length > this.maxSnapshots) {
      this.metrics.snapshots.shift();
    }

    console.log(`📸 Memory snapshot (${label}):`, {
      used: this.formatBytes(memory.used),
      total: this.formatBytes(memory.total),
      domNodes: snapshot.domNodes,
      eventListeners: snapshot.eventListeners,
    });
  }

  // Get current memory usage
  getCurrentMemoryUsage() {
    if (typeof performance !== "undefined" && performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        available:
          performance.memory.jsHeapSizeLimit -
          performance.memory.usedJSHeapSize,
      };
    }

    // Fallback for browsers without performance.memory
    return {
      used: 0,
      total: 0,
      limit: 0,
      available: 0,
    };
  }

  // Count DOM nodes
  countDOMNodes() {
    return document.querySelectorAll("*").length;
  }

  // Count event listeners (approximate)
  countEventListeners() {
    // This is an approximation - browsers don't expose exact count
    const elements = document.querySelectorAll("*");
    let count = 0;

    elements.forEach((element) => {
      // Check for common event listener patterns
      const attributes = element.attributes;
      for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        if (attr.name.startsWith("on") && attr.value) {
          count++;
        }
      }
    });

    return count;
  }

  // Count active timers (approximate)
  countTimers() {
    // This is an approximation - browsers don't expose exact count
    return {
      timeouts: 0, // Would need to track manually
      intervals: 0, // Would need to track manually
    };
  }

  // Analyze memory usage for leaks
  analyzeMemoryUsage() {
    if (this.metrics.snapshots.length < 2) return;

    const current = this.metrics.current;
    const previous =
      this.metrics.snapshots[this.metrics.snapshots.length - 2].memory;

    // Check for memory leaks
    const memoryIncrease = current.used - previous.used;
    const timeDiff =
      Date.now() -
      this.metrics.snapshots[this.metrics.snapshots.length - 2].timestamp;

    // If memory increased significantly over time, flag as potential leak
    if (memoryIncrease > this.leakThreshold && timeDiff > 30000) {
      // 30 seconds
      this.metrics.leaks.push({
        timestamp: Date.now(),
        increase: memoryIncrease,
        current: current.used,
        previous: previous.used,
        severity: this.getLeakSeverity(memoryIncrease),
      });

      console.warn("🚨 Potential memory leak detected:", {
        increase: this.formatBytes(memoryIncrease),
        current: this.formatBytes(current.used),
        severity: this.getLeakSeverity(memoryIncrease),
      });
    }

    // Generate recommendations
    this.generateRecommendations();
  }

  // Get leak severity level
  getLeakSeverity(increase) {
    if (increase > 50 * 1024 * 1024) return "critical"; // 50MB
    if (increase > 20 * 1024 * 1024) return "high"; // 20MB
    if (increase > 10 * 1024 * 1024) return "medium"; // 10MB
    return "low";
  }

  // Generate memory optimization recommendations
  generateRecommendations() {
    const recommendations = [];
    const current = this.metrics.current;

    // Memory usage recommendations
    if (current.used > current.limit * 0.8) {
      recommendations.push({
        type: "critical",
        message: "Memory usage is above 80% of limit",
        action:
          "Consider implementing memory cleanup and reducing data retention",
      });
    }

    // DOM node recommendations
    const currentSnapshot =
      this.metrics.snapshots[this.metrics.snapshots.length - 1];
    if (currentSnapshot.domNodes > 1000) {
      recommendations.push({
        type: "warning",
        message: "High DOM node count detected",
        action:
          "Consider virtualizing long lists or removing unused DOM elements",
      });
    }

    // Event listener recommendations
    if (currentSnapshot.eventListeners > 500) {
      recommendations.push({
        type: "warning",
        message: "High event listener count detected",
        action: "Review event listener cleanup and consider event delegation",
      });
    }

    this.metrics.recommendations = recommendations;
  }

  // Generate comprehensive memory report
  generateReport() {
    console.log("\n📊 MEMORY PROFILING REPORT");
    console.log("===========================");

    const baseline = this.metrics.baseline;
    const current = this.metrics.current;
    const memoryIncrease = current.used - baseline.used;

    console.log(`Baseline Memory: ${this.formatBytes(baseline.used)}`);
    console.log(`Current Memory: ${this.formatBytes(current.used)}`);
    console.log(`Memory Increase: ${this.formatBytes(memoryIncrease)}`);
    console.log(
      `Memory Efficiency: ${((current.available / current.limit) * 100).toFixed(
        1
      )}%`
    );
    console.log(`Snapshots Taken: ${this.metrics.snapshots.length}`);
    console.log(`Leaks Detected: ${this.metrics.leaks.length}`);

    if (this.metrics.leaks.length > 0) {
      console.log("\n🚨 MEMORY LEAKS DETECTED:");
      this.metrics.leaks.forEach((leak, index) => {
        console.log(
          `  ${index + 1}. ${leak.severity.toUpperCase()}: +${this.formatBytes(
            leak.increase
          )}`
        );
      });
    }

    if (this.metrics.recommendations.length > 0) {
      console.log("\n💡 OPTIMIZATION RECOMMENDATIONS:");
      this.metrics.recommendations.forEach((rec, index) => {
        console.log(
          `  ${index + 1}. [${rec.type.toUpperCase()}] ${rec.message}`
        );
        console.log(`     Action: ${rec.action}`);
      });
    }

    // Performance score
    const score = this.calculateMemoryScore();
    console.log(`\n🎯 Memory Performance Score: ${score}/100`);

    if (score < 70) {
      console.log("⚠️  Memory performance needs improvement");
    } else if (score < 90) {
      console.log("✅ Memory performance is good");
    } else {
      console.log("🌟 Memory performance is excellent!");
    }
  }

  // Calculate memory performance score
  calculateMemoryScore() {
    let score = 100;
    const current = this.metrics.current;

    // Deduct points for high memory usage
    const memoryUsagePercent = (current.used / current.limit) * 100;
    if (memoryUsagePercent > 80) score -= 30;
    else if (memoryUsagePercent > 60) score -= 20;
    else if (memoryUsagePercent > 40) score -= 10;

    // Deduct points for memory leaks
    score -= this.metrics.leaks.length * 10;

    // Deduct points for high DOM node count
    const currentSnapshot =
      this.metrics.snapshots[this.metrics.snapshots.length - 1];
    if (currentSnapshot.domNodes > 1000) score -= 15;
    else if (currentSnapshot.domNodes > 500) score -= 10;

    return Math.max(0, score);
  }

  // Format bytes to human readable format
  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Get current memory stats
  getStats() {
    return {
      current: this.metrics.current,
      snapshots: this.metrics.snapshots.length,
      leaks: this.metrics.leaks.length,
      recommendations: this.metrics.recommendations.length,
      isMonitoring: this.isMonitoring,
    };
  }

  // Cleanup
  cleanup() {
    this.stopMonitoring();
    this.metrics = {
      snapshots: [],
      leaks: [],
      recommendations: [],
      baseline: null,
      current: null,
    };
    console.log("🧹 Memory profiler cleaned up");
  }
}

// Export for use
export default MemoryProfiler;

// Development helper
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  window.MemoryProfiler = MemoryProfiler;
  console.log(
    "🔍 MemoryProfiler available in console as window.MemoryProfiler"
  );
}
