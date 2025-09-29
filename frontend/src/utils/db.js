import Dexie from "dexie";

// IndexedDB for caching thumbnails and offline data
export class ReviewerDB extends Dexie {
  constructor() {
    super("ReviewerDatabase");
    this.version(1).stores({
      thumbnails: "id, url, blob, timestamp",
      reviewers: "id, data, timestamp",
      searches: "query, timestamp",
      preferences: "key, value",
    });
  }
}

export const db = new ReviewerDB();

// Cache management
export const cacheManager = {
  // PDF Thumbnail caching
  async getCachedThumbnail(url) {
    try {
      const cached = await db.thumbnails.where("url").equals(url).first();
      if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        // 24 hours
        return cached.blob;
      }
      return null;
    } catch (error) {
      console.warn("Error getting cached thumbnail:", error);
      return null;
    }
  },

  async setCachedThumbnail(url, blob) {
    try {
      await db.thumbnails.put({
        id: url,
        url,
        blob,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn("Error caching thumbnail:", error);
    }
  },

  // Reviewer data caching
  async getCachedReviewers() {
    try {
      const cached = await db.reviewers.where("id").equals("main").first();
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        // 5 minutes
        return cached.data;
      }
      return null;
    } catch (error) {
      console.warn("Error getting cached reviewers:", error);
      return null;
    }
  },

  async setCachedReviewers(data) {
    try {
      await db.reviewers.put({
        id: "main",
        data,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn("Error caching reviewers:", error);
    }
  },

  // Search history
  async addSearchHistory(query) {
    try {
      await db.searches.put({
        query: query.toLowerCase().trim(),
        timestamp: Date.now(),
      });

      // Keep only last 50 searches
      const allSearches = await db.searches.orderBy("timestamp").toArray();
      if (allSearches.length > 50) {
        await db.searches
          .where("timestamp")
          .below(allSearches[allSearches.length - 50].timestamp)
          .delete();
      }
    } catch (error) {
      console.warn("Error adding search history:", error);
    }
  },

  async getSearchHistory(query = "") {
    try {
      return await db.searches
        .where("query")
        .startsWith(query.toLowerCase())
        .reverse()
        .sortBy("timestamp");
    } catch (error) {
      console.warn("Error getting search history:", error);
      return [];
    }
  },

  // User preferences
  async getPreference(key, defaultValue = null) {
    try {
      const pref = await db.preferences.where("key").equals(key).first();
      return pref ? pref.value : defaultValue;
    } catch (error) {
      console.warn("Error getting preference:", error);
      return defaultValue;
    }
  },

  async setPreference(key, value) {
    try {
      await db.preferences.put({ key, value });
    } catch (error) {
      console.warn("Error setting preference:", error);
    }
  },

  // Clear old cache
  async clearOldCache() {
    try {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      await db.thumbnails.where("timestamp").below(oneDayAgo).delete();

      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      await db.reviewers.where("timestamp").below(oneHourAgo).delete();
    } catch (error) {
      console.warn("Error clearing old cache:", error);
    }
  },
};

// Initialize cache cleanup on load
if (typeof window !== "undefined") {
  cacheManager.clearOldCache();
}
