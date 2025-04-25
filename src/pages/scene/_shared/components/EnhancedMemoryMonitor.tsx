import { useEffect, useState } from "react";
import {
  memoryManager,
  MemoryStats,
  MemoryPressureLevel,
} from "../services/MemoryManagementService";

interface EnhancedMemoryMonitorProps {
  refreshInterval?: number; // in milliseconds
  showActions?: boolean;
  floating?: boolean;
  onOptimizeMemory?: () => void;
}

const EnhancedMemoryMonitor: React.FC<EnhancedMemoryMonitorProps> = ({
  refreshInterval = 2000,
  showActions = true,
  floating = true,
  onOptimizeMemory,
}) => {
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [optimizationInProgress, setOptimizationInProgress] = useState(false);

  // Helper function to format bytes to MB/GB
  const formatMemory = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Get color based on memory pressure level
  const getUsageColor = (pressureLevel: MemoryPressureLevel): string => {
    switch (pressureLevel) {
      case MemoryPressureLevel.CRITICAL:
        return "bg-red-500";
      case MemoryPressureLevel.HIGH:
        return "bg-orange-500";
      case MemoryPressureLevel.MEDIUM:
        return "bg-yellow-500";
      default:
        return "bg-green-500";
    }
  };

  // Get text color based on memory pressure level
  const getTextColor = (pressureLevel: MemoryPressureLevel): string => {
    switch (pressureLevel) {
      case MemoryPressureLevel.CRITICAL:
        return "text-red-200";
      case MemoryPressureLevel.HIGH:
        return "text-orange-200";
      case MemoryPressureLevel.MEDIUM:
        return "text-yellow-100";
      default:
        return "text-green-100";
    }
  };

  // Format last GC time
  const formatLastGC = (timestamp: number | null): string => {
    if (!timestamp) return "Never";

    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s ago`;
  };

  // Handle manual optimization
  const handleOptimizeMemory = async () => {
    setOptimizationInProgress(true);

    // Call the provided callback if available
    if (onOptimizeMemory) {
      onOptimizeMemory();
    } else {
      // Otherwise use our memory manager
      memoryManager.applyAggressiveOptimization();
    }

    // Show optimization in progress for 2 seconds
    setTimeout(() => {
      setOptimizationInProgress(false);
    }, 2000);
  };

  useEffect(() => {
    // Update memory stats periodically
    const updateMemoryStats = () => {
      const stats = memoryManager.getMemoryStats();
      setMemoryStats(stats);
    };

    // Register as a listener to get updates from memory manager
    const statsListener = (stats: MemoryStats) => {
      setMemoryStats(stats);
    };
    memoryManager.addStatsListener(statsListener);

    // Initial stats fetch
    updateMemoryStats();

    // Set up interval for regular updates
    const intervalId = setInterval(updateMemoryStats, refreshInterval);

    return () => {
      clearInterval(intervalId);
      memoryManager.removeStatsListener(statsListener);
    };
  }, [refreshInterval]);

  if (!memoryStats) {
    return (
      <div
        className={`${
          floating ? "absolute top-2 right-2" : ""
        } bg-black/50 text-white p-2 rounded z-50`}
      >
        Initializing memory monitor...
      </div>
    );
  }

  const containerClasses = floating
    ? `absolute top-2 right-2 bg-black/70 text-white p-2 rounded z-50 ${
        isExpanded ? "min-w-[260px]" : "min-w-[180px]"
      } transition-all duration-300`
    : `bg-black/70 text-white p-2 rounded ${
        isExpanded ? "min-w-[260px]" : "min-w-[180px]"
      } transition-all duration-300`;

  return (
    <div
      className={containerClasses}
      style={{ cursor: "pointer" }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex justify-between items-center">
        <span
          className={`font-bold ${getTextColor(memoryStats.pressureLevel)}`}
        >
          Memory {memoryStats.pressureLevel.toUpperCase()}
        </span>
        <span>{isExpanded ? "▲" : "▼"}</span>
      </div>

      {/* Memory bar */}
      <div className="w-full h-2 bg-gray-700 mt-1 rounded overflow-hidden">
        <div
          className={`h-full ${getUsageColor(
            memoryStats.pressureLevel
          )} transition-all duration-300`}
          style={{ width: `${memoryStats.usagePercentage}%` }}
        />
      </div>

      {/* Basic info always visible */}
      <div className="flex justify-between text-xs mt-1">
        <span>JS Heap: {formatMemory(memoryStats.jsHeapUsed)}</span>
        <span>{memoryStats.usagePercentage.toFixed(1)}%</span>
      </div>

      {/* Detailed breakdown when expanded */}
      {isExpanded && (
        <div
          className="mt-2 text-xs border-t border-gray-600 pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between">
            <span>Heap Limit:</span>
            <span>{formatMemory(memoryStats.jsHeapLimit)}</span>
          </div>

          {memoryStats.tilesMemoryUsage !== undefined && (
            <div className="flex justify-between mt-1">
              <span>Tiles Memory:</span>
              <span>{formatMemory(memoryStats.tilesMemoryUsage)}</span>
            </div>
          )}

          <div className="flex justify-between mt-1">
            <span>Last GC:</span>
            <span>{formatLastGC(memoryStats.lastGarbageCollection)}</span>
          </div>

          {showActions && (
            <div className="mt-2 space-y-1">
              <button
                className={`w-full py-1 rounded text-xs ${
                  optimizationInProgress
                    ? "bg-blue-900 text-blue-300"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                onClick={handleOptimizeMemory}
                disabled={optimizationInProgress}
              >
                {optimizationInProgress ? "Optimizing..." : "Optimize Memory"}
              </button>

              {memoryStats.pressureLevel === MemoryPressureLevel.CRITICAL && (
                <div className="text-red-300 text-center text-xs mt-1">
                  Memory pressure critical!
                </div>
              )}

              {memoryStats.pressureLevel === MemoryPressureLevel.HIGH && (
                <div className="text-orange-300 text-center text-xs mt-1">
                  Consider reducing detail
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedMemoryMonitor;
