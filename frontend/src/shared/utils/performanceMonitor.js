/**
 * Performance monitoring utilities for admin pages
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.operations = new Map();
  }

  /**
   * Start timing an operation
   * @param {string} operationName - Name of the operation
   * @returns {string} - Operation ID
   */
  startOperation(operationName) {
    const operationId = `${operationName}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    this.operations.set(operationId, {
      name: operationName,
      startTime: performance.now(),
      status: "running",
    });
    return operationId;
  }

  /**
   * End timing an operation
   * @param {string} operationId - Operation ID from startOperation
   * @param {string} status - Operation status ('success', 'error', 'cancelled')
   * @param {Object} metadata - Additional metadata about the operation
   */
  endOperation(operationId, status = "success", metadata = {}) {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.endTime = performance.now();
    operation.duration = operation.endTime - operation.startTime;
    operation.status = status;
    operation.metadata = metadata;

    // Store metric
    const metricKey = `${operation.name}_${status}`;
    if (!this.metrics.has(metricKey)) {
      this.metrics.set(metricKey, []);
    }
    this.metrics.get(metricKey).push(operation.duration);

    // Keep only last 100 metrics per operation
    if (this.metrics.get(metricKey).length > 100) {
      this.metrics.get(metricKey).shift();
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(
        `Performance: ${operation.name} took ${operation.duration.toFixed(
          2
        )}ms (${status})`,
        metadata
      );
    }
  }

  /**
   * Get performance statistics for an operation
   * @param {string} operationName - Name of the operation
   * @param {string} status - Status filter (optional)
   * @returns {Object} - Performance statistics
   */
  getStats(operationName, status = null) {
    const key = status ? `${operationName}_${status}` : operationName;
    const durations = [];

    for (const [metricKey, values] of this.metrics.entries()) {
      if (metricKey.startsWith(operationName)) {
        if (!status || metricKey.endsWith(`_${status}`)) {
          durations.push(...values);
        }
      }
    }

    if (durations.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        totalDuration: 0,
      };
    }

    const totalDuration = durations.reduce(
      (sum, duration) => sum + duration,
      0
    );
    const avgDuration = totalDuration / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    return {
      count: durations.length,
      avgDuration,
      minDuration,
      maxDuration,
      totalDuration,
    };
  }

  /**
   * Get all performance metrics
   * @returns {Object} - All performance metrics
   */
  getAllMetrics() {
    const result = {};
    for (const [key, durations] of this.metrics.entries()) {
      result[key] = this.getStats(
        key.split("_")[0],
        key.split("_").slice(1).join("_")
      );
    }
    return result;
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.clear();
    this.operations.clear();
  }

  /**
   * Export metrics for analysis
   * @returns {Object} - Exportable metrics data
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.getAllMetrics(),
      operations: Array.from(this.operations.values()),
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator function to measure performance of async functions
 * @param {string} operationName - Name of the operation
 * @returns {Function} - Decorated function
 */
export const measurePerformance = (operationName) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const operationId = performanceMonitor.startOperation(operationName);
      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.endOperation(operationId, "success");
        return result;
      } catch (error) {
        performanceMonitor.endOperation(operationId, "error", {
          error: error.message,
        });
        throw error;
      }
    };

    return descriptor;
  };
};

/**
 * Hook to measure performance of React components
 * @param {string} componentName - Name of the component
 * @returns {Object} - Performance measurement utilities
 */
export const usePerformanceMonitor = (componentName) => {
  const startRender = () => {
    return performanceMonitor.startOperation(`${componentName}_render`);
  };

  const endRender = (operationId, status = "success") => {
    performanceMonitor.endOperation(operationId, status);
  };

  return {
    startRender,
    endRender,
    getStats: (status) =>
      performanceMonitor.getStats(`${componentName}_render`, status),
  };
};

export default performanceMonitor;
