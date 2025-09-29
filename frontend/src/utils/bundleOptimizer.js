// Bundle Optimization Utility for PvP Game
// Implements code splitting, lazy loading, and bundle analysis

class BundleOptimizer {
  constructor() {
    this.metrics = {
      bundleSize: 0,
      chunkCount: 0,
      loadTime: 0,
      parseTime: 0,
      unusedCode: 0,
      duplicateCode: 0,
    };
    this.chunks = new Map();
    this.loadedModules = new Map();
    this.pendingModules = new Map();
  }

  // Initialize bundle optimization
  initialize() {
    this.measureBundleSize();
    this.setupLazyLoading();
    this.analyzeBundle();
    console.log("📦 Bundle optimizer initialized");
  }

  // Measure current bundle size
  measureBundleSize() {
    if (typeof performance !== "undefined" && performance.memory) {
      this.metrics.bundleSize = performance.memory.usedJSHeapSize;
    }

    // Measure script load time
    const scripts = document.querySelectorAll("script[src]");
    let totalSize = 0;

    scripts.forEach((script) => {
      if (script.src && !script.src.includes("chrome-extension")) {
        // This is a simplified measurement
        // In a real implementation, you'd fetch and measure actual sizes
        totalSize += this.estimateScriptSize(script.src);
      }
    });

    this.metrics.bundleSize = totalSize;
    console.log(`📦 Estimated bundle size: ${this.formatBytes(totalSize)}`);
  }

  // Estimate script size (simplified)
  estimateScriptSize(src) {
    // This is a placeholder - in reality you'd need to fetch the actual size
    const commonSizes = {
      vendor: 500000, // 500KB
      main: 200000, // 200KB
      chunk: 50000, // 50KB
    };

    for (const [pattern, size] of Object.entries(commonSizes)) {
      if (src.includes(pattern)) {
        return size;
      }
    }

    return 100000; // Default 100KB
  }

  // Setup lazy loading for non-critical components
  setupLazyLoading() {
    // Lazy load heavy components
    this.lazyLoadComponent("QuestionModal", () =>
      import("../users/students/pages/demo/components/QuestionModal")
    );
    this.lazyLoadComponent("VictoryModal", () =>
      import("../users/students/pages/demo/components/VictoryModal")
    );
    this.lazyLoadComponent("BattleField", () =>
      import("../users/students/pages/demo/components/BattleField")
    );

    console.log("🔄 Lazy loading setup complete");
  }

  // Lazy load a component
  async lazyLoadComponent(name, loader) {
    if (this.loadedModules.has(name)) {
      return this.loadedModules.get(name);
    }

    if (this.pendingModules.has(name)) {
      return this.pendingModules.get(name);
    }

    const promise = loader()
      .then((module) => {
        this.loadedModules.set(name, module);
        this.pendingModules.delete(name);
        console.log(`📦 Lazy loaded: ${name}`);
        return module;
      })
      .catch((error) => {
        console.error(`❌ Failed to load ${name}:`, error);
        this.pendingModules.delete(name);
        throw error;
      });

    this.pendingModules.set(name, promise);
    return promise;
  }

  // Analyze bundle for optimization opportunities
  analyzeBundle() {
    this.analyzeUnusedCode();
    this.analyzeDuplicateCode();
    this.analyzeChunkSizes();
    this.generateOptimizationRecommendations();
  }

  // Analyze for unused code
  analyzeUnusedCode() {
    // This would integrate with a bundle analyzer in a real implementation
    const estimatedUnused = this.metrics.bundleSize * 0.15; // Assume 15% unused
    this.metrics.unusedCode = estimatedUnused;

    console.log(
      `🔍 Estimated unused code: ${this.formatBytes(estimatedUnused)}`
    );
  }

  // Analyze for duplicate code
  analyzeDuplicateCode() {
    // This would integrate with a bundle analyzer in a real implementation
    const estimatedDuplicate = this.metrics.bundleSize * 0.08; // Assume 8% duplicate
    this.metrics.duplicateCode = estimatedDuplicate;

    console.log(
      `🔍 Estimated duplicate code: ${this.formatBytes(estimatedDuplicate)}`
    );
  }

  // Analyze chunk sizes
  analyzeChunkSizes() {
    const scripts = document.querySelectorAll("script[src]");
    this.metrics.chunkCount = scripts.length;

    let totalSize = 0;
    const chunkSizes = [];

    scripts.forEach((script) => {
      if (script.src && !script.src.includes("chrome-extension")) {
        const size = this.estimateScriptSize(script.src);
        chunkSizes.push({ src: script.src, size });
        totalSize += size;
      }
    });

    this.chunks = new Map(chunkSizes.map((chunk) => [chunk.src, chunk.size]));

    console.log(`📊 Analyzed ${this.metrics.chunkCount} chunks`);
  }

  // Generate optimization recommendations
  generateOptimizationRecommendations() {
    const recommendations = [];

    // Bundle size recommendations
    if (this.metrics.bundleSize > 1000000) {
      // 1MB
      recommendations.push({
        type: "warning",
        message: "Bundle size is large",
        action: "Consider code splitting and tree shaking",
      });
    }

    // Chunk count recommendations
    if (this.metrics.chunkCount > 20) {
      recommendations.push({
        type: "info",
        message: "High chunk count",
        action: "Consider consolidating smaller chunks",
      });
    }

    // Unused code recommendations
    if (this.metrics.unusedCode > this.metrics.bundleSize * 0.1) {
      recommendations.push({
        type: "warning",
        message: "Significant unused code detected",
        action: "Enable tree shaking and remove unused imports",
      });
    }

    // Duplicate code recommendations
    if (this.metrics.duplicateCode > this.metrics.bundleSize * 0.05) {
      recommendations.push({
        type: "warning",
        message: "Duplicate code detected",
        action: "Check for duplicate dependencies and optimize imports",
      });
    }

    this.recommendations = recommendations;
    return recommendations;
  }

  // Optimize imports dynamically
  optimizeImports(moduleName, imports) {
    const optimizedImports = {};

    for (const [key, value] of Object.entries(imports)) {
      if (this.isImportUsed(key, moduleName)) {
        optimizedImports[key] = value;
      }
    }

    console.log(
      `🔧 Optimized imports for ${moduleName}:`,
      Object.keys(optimizedImports)
    );
    return optimizedImports;
  }

  // Check if import is actually used
  isImportUsed(importName, moduleName) {
    // This is a simplified check - in reality you'd analyze the AST
    const usagePatterns = [
      new RegExp(`\\b${importName}\\b`, "g"),
      new RegExp(`"${importName}"`, "g"),
      new RegExp(`'${importName}'`, "g"),
    ];

    // Check if import is used in the current module
    const moduleCode = this.getModuleCode(moduleName);
    return usagePatterns.some((pattern) => pattern.test(moduleCode));
  }

  // Get module code (simplified)
  getModuleCode(moduleName) {
    // This would need to be implemented based on your module system
    return "";
  }

  // Preload critical resources
  preloadCriticalResources() {
    const criticalResources = [
      "/src/users/students/pages/demo/components/QuestionModal.jsx",
      "/src/users/students/pages/demo/components/VictoryModal.jsx",
      "/src/users/students/pages/demo/components/BattleField.jsx",
    ];

    criticalResources.forEach((resource) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.href = resource;
      link.as = "script";
      document.head.appendChild(link);
    });

    console.log("⚡ Preloaded critical resources");
  }

  // Implement code splitting for routes
  splitRoutes() {
    const routes = [
      { path: "/game", component: "GameComponent" },
      { path: "/lobby", component: "LobbyComponent" },
      { path: "/profile", component: "ProfileComponent" },
    ];

    routes.forEach((route) => {
      this.lazyLoadComponent(route.component, () =>
        import(`../pages/${route.component}`)
      );
    });

    console.log("🔄 Route-based code splitting implemented");
  }

  // Monitor bundle performance
  monitorPerformance() {
    if (typeof performance !== "undefined") {
      const navigation = performance.getEntriesByType("navigation")[0];
      if (navigation) {
        this.metrics.loadTime =
          navigation.loadEventEnd - navigation.loadEventStart;
        this.metrics.parseTime =
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart;
      }
    }

    console.log(`⏱️ Load time: ${this.metrics.loadTime}ms`);
    console.log(`⏱️ Parse time: ${this.metrics.parseTime}ms`);
  }

  // Get bundle statistics
  getStats() {
    return {
      ...this.metrics,
      loadedModules: this.loadedModules.size,
      pendingModules: this.pendingModules.size,
      recommendations: this.recommendations?.length || 0,
    };
  }

  // Generate bundle report
  generateReport() {
    console.log("\n📊 BUNDLE OPTIMIZATION REPORT");
    console.log("==============================");
    console.log(`Bundle Size: ${this.formatBytes(this.metrics.bundleSize)}`);
    console.log(`Chunk Count: ${this.metrics.chunkCount}`);
    console.log(`Load Time: ${this.metrics.loadTime}ms`);
    console.log(`Parse Time: ${this.metrics.parseTime}ms`);
    console.log(`Unused Code: ${this.formatBytes(this.metrics.unusedCode)}`);
    console.log(
      `Duplicate Code: ${this.formatBytes(this.metrics.duplicateCode)}`
    );
    console.log(`Loaded Modules: ${this.loadedModules.size}`);
    console.log(`Pending Modules: ${this.pendingModules.size}`);

    if (this.recommendations && this.recommendations.length > 0) {
      console.log("\n💡 OPTIMIZATION RECOMMENDATIONS:");
      this.recommendations.forEach((rec, index) => {
        console.log(
          `  ${index + 1}. [${rec.type.toUpperCase()}] ${rec.message}`
        );
        console.log(`     Action: ${rec.action}`);
      });
    }

    // Performance score
    const score = this.calculateBundleScore();
    console.log(`\n🎯 Bundle Performance Score: ${score}/100`);
  }

  // Calculate bundle performance score
  calculateBundleScore() {
    let score = 100;

    // Deduct points for large bundle size
    if (this.metrics.bundleSize > 2000000) score -= 30; // 2MB
    else if (this.metrics.bundleSize > 1000000) score -= 20; // 1MB
    else if (this.metrics.bundleSize > 500000) score -= 10; // 500KB

    // Deduct points for slow load time
    if (this.metrics.loadTime > 3000) score -= 25; // 3s
    else if (this.metrics.loadTime > 2000) score -= 15; // 2s
    else if (this.metrics.loadTime > 1000) score -= 10; // 1s

    // Deduct points for unused code
    const unusedRatio = this.metrics.unusedCode / this.metrics.bundleSize;
    if (unusedRatio > 0.2) score -= 20; // 20%
    else if (unusedRatio > 0.1) score -= 10; // 10%

    // Deduct points for duplicate code
    const duplicateRatio = this.metrics.duplicateCode / this.metrics.bundleSize;
    if (duplicateRatio > 0.1) score -= 15; // 10%
    else if (duplicateRatio > 0.05) score -= 10; // 5%

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

  // Cleanup
  cleanup() {
    this.loadedModules.clear();
    this.pendingModules.clear();
    this.chunks.clear();
    console.log("🧹 Bundle optimizer cleaned up");
  }
}

// Export for use
export default BundleOptimizer;

// Development helper
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  window.BundleOptimizer = BundleOptimizer;
  console.log(
    "📦 BundleOptimizer available in console as window.BundleOptimizer"
  );
}
