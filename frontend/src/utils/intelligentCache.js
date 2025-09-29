// Intelligent Caching System for PvP Game
// Implements smart caching with TTL, LRU, and predictive prefetching

class IntelligentCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100; // Maximum number of items
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes default
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute
    this.prefetchThreshold = options.prefetchThreshold || 0.8; // 80% cache hit rate

    this.cache = new Map();
    this.accessOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      prefetches: 0,
      size: 0,
      hitRate: 0,
    };

    this.prefetchQueue = [];
    this.isCleaningUp = false;

    // Start cleanup interval
    this.startCleanup();

    console.log("🗄️ Intelligent cache initialized");
  }

  // Set cache item with TTL and priority
  set(key, value, options = {}) {
    const ttl = options.ttl || this.defaultTTL;
    const priority = options.priority || "normal"; // low, normal, high, critical
    const tags = options.tags || [];
    const dependencies = options.dependencies || [];

    const item = {
      value,
      ttl,
      priority,
      tags,
      dependencies,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
    };

    // Remove existing item if it exists
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    // Add new item
    this.cache.set(key, item);
    this.addToAccessOrder(key);

    // Check if we need to evict items
    if (this.cache.size > this.maxSize) {
      this.evictItems();
    }

    this.updateStats();
    console.log(`💾 Cached: ${key} (TTL: ${ttl}ms, Priority: ${priority})`);
  }

  // Get cache item
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Check if item has expired
    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Update access information
    item.lastAccessed = Date.now();
    item.accessCount++;
    this.moveToEnd(key);

    this.stats.hits++;
    this.updateStats();

    // Trigger prefetch if hit rate is high
    this.checkPrefetchTrigger();

    return item.value;
  }

  // Check if item has expired
  isExpired(item) {
    return Date.now() - item.createdAt > item.ttl;
  }

  // Add key to access order
  addToAccessOrder(key) {
    this.accessOrder.push(key);
  }

  // Remove key from access order
  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  // Move key to end of access order (most recently used)
  moveToEnd(key) {
    this.removeFromAccessOrder(key);
    this.addToAccessOrder(key);
  }

  // Evict items using LRU strategy with priority consideration
  evictItems() {
    const itemsToEvict = this.cache.size - this.maxSize + 1;
    let evicted = 0;

    // Sort by priority and access time
    const sortedKeys = this.accessOrder.slice().sort((a, b) => {
      const itemA = this.cache.get(a);
      const itemB = this.cache.get(b);

      // Priority order: critical > high > normal > low
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const priorityDiff =
        priorityOrder[itemB.priority] - priorityOrder[itemA.priority];

      if (priorityDiff !== 0) return priorityDiff;

      // If same priority, evict least recently used
      return itemA.lastAccessed - itemB.lastAccessed;
    });

    for (const key of sortedKeys) {
      if (evicted >= itemsToEvict) break;

      const item = this.cache.get(key);
      if (item && item.priority !== "critical") {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        evicted++;
        this.stats.evictions++;

        console.log(`🗑️ Evicted: ${key} (Priority: ${item.priority})`);
      }
    }

    this.updateStats();
  }

  // Update cache statistics
  updateStats() {
    this.stats.size = this.cache.size;
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  // Check if prefetch should be triggered
  checkPrefetchTrigger() {
    if (this.stats.hitRate >= this.prefetchThreshold * 100) {
      this.triggerPrefetch();
    }
  }

  // Trigger prefetch for likely needed items
  triggerPrefetch() {
    // This would integrate with the game's prefetch logic
    console.log(
      "🔮 Prefetch triggered - hit rate:",
      this.stats.hitRate.toFixed(1) + "%"
    );
    this.stats.prefetches++;
  }

  // Get items by tag
  getByTag(tag) {
    const results = [];
    for (const [key, item] of this.cache.entries()) {
      if (item.tags.includes(tag) && !this.isExpired(item)) {
        results.push({ key, value: item.value });
      }
    }
    return results;
  }

  // Invalidate items by tag
  invalidateByTag(tag) {
    const keysToRemove = [];
    for (const [key, item] of this.cache.entries()) {
      if (item.tags.includes(tag)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    });

    console.log(`🏷️ Invalidated ${keysToRemove.length} items with tag: ${tag}`);
    this.updateStats();
  }

  // Invalidate items by dependency
  invalidateByDependency(dependency) {
    const keysToRemove = [];
    for (const [key, item] of this.cache.entries()) {
      if (item.dependencies.includes(dependency)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    });

    console.log(
      `🔗 Invalidated ${keysToRemove.length} items with dependency: ${dependency}`
    );
    this.updateStats();
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      prefetches: 0,
      size: 0,
      hitRate: 0,
    };
    console.log("🧹 Cache cleared");
  }

  // Start cleanup interval
  startCleanup() {
    if (this.cleanupIntervalId) return;

    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  // Cleanup expired items
  cleanup() {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    const now = Date.now();
    const keysToRemove = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.createdAt > item.ttl) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    });

    if (keysToRemove.length > 0) {
      console.log(`🧹 Cleaned up ${keysToRemove.length} expired items`);
    }

    this.updateStats();
    this.isCleaningUp = false;
  }

  // Get cache statistics
  getStats() {
    return {
      ...this.stats,
      maxSize: this.maxSize,
      currentSize: this.cache.size,
      utilization: (this.cache.size / this.maxSize) * 100,
    };
  }

  // Generate cache report
  generateReport() {
    console.log("\n📊 CACHE PERFORMANCE REPORT");
    console.log("============================");
    console.log(
      `Cache Size: ${this.cache.size}/${
        this.maxSize
      } (${this.stats.utilization.toFixed(1)}%)`
    );
    console.log(`Hit Rate: ${this.stats.hitRate.toFixed(1)}%`);
    console.log(`Total Hits: ${this.stats.hits}`);
    console.log(`Total Misses: ${this.stats.misses}`);
    console.log(`Evictions: ${this.stats.evictions}`);
    console.log(`Prefetches: ${this.stats.prefetches}`);

    // Performance recommendations
    if (this.stats.hitRate < 70) {
      console.log("💡 Consider increasing cache size or TTL");
    }
    if (this.stats.evictions > this.cache.size * 0.5) {
      console.log("💡 High eviction rate - consider increasing max size");
    }
    if (this.stats.utilization < 50) {
      console.log("💡 Low cache utilization - consider decreasing max size");
    }
  }

  // Game-specific caching methods
  cacheGameState(gameId, gameState) {
    this.set(`game_state_${gameId}`, gameState, {
      ttl: 600000, // 10 minutes
      priority: "high",
      tags: ["game_state", gameId],
      dependencies: ["game_room"],
    });
  }

  cachePlayerData(playerId, playerData) {
    this.set(`player_${playerId}`, playerData, {
      ttl: 300000, // 5 minutes
      priority: "normal",
      tags: ["player", playerId],
      dependencies: ["user_profile"],
    });
  }

  cacheQuestionData(questionId, questionData) {
    this.set(`question_${questionId}`, questionData, {
      ttl: 1800000, // 30 minutes
      priority: "normal",
      tags: ["question", questionId],
      dependencies: ["question_bank"],
    });
  }

  // Cleanup
  cleanup() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    this.clear();
    console.log("🧹 Intelligent cache cleaned up");
  }
}

// Export for use
export default IntelligentCache;

// Development helper
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  window.IntelligentCache = IntelligentCache;
  console.log(
    "🗄️ IntelligentCache available in console as window.IntelligentCache"
  );
}
