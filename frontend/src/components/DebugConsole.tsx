import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Minimize2, Maximize2, Trash2, Download } from 'lucide-react';

interface DebugLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
}

interface DebugConsoleProps {
  isVisible: boolean;
  onToggle: () => void;
  logs: DebugLogEntry[];
  onClearLogs: () => void;
}

const DebugConsole: React.FC<DebugConsoleProps> = ({ 
  isVisible, 
  onToggle, 
  logs, 
  onClearLogs 
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Get log level color
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      case 'debug': return 'text-gray-400';
      default: return 'text-gray-300';
    }
  };

  // Get log level prefix
  const getLevelPrefix = (level: string) => {
    switch (level) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🔍';
      default: return '•';
    }
  };

  // Export logs to file
  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()} [${log.source}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intelligence-empire-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 right-4 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-40 ${
      isMinimized ? 'w-80 h-12' : 'w-96 h-80'
    } transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-white">Debug Console</span>
          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
            {logs.length} logs
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Export Logs */}
          <button
            onClick={exportLogs}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Export logs"
          >
            <Download className="w-3 h-3" />
          </button>
          
          {/* Clear Logs */}
          <button
            onClick={onClearLogs}
            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          
          {/* Minimize/Maximize */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
          
          {/* Close */}
          <button
            onClick={onToggle}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Close debug console"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex flex-col h-full">
          {/* Controls */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-850">
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="w-3 h-3 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span>Auto-scroll</span>
              </label>
            </div>
            
            <div className="text-xs text-gray-500">
              {logs.length > 0 && `Latest: ${formatTime(logs[logs.length - 1]?.timestamp)}`}
            </div>
          </div>

          {/* Logs */}
          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs bg-gray-900">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No debug logs yet</p>
                <p className="text-xs mt-1">System messages will appear here</p>
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-2 py-1 hover:bg-gray-800 rounded px-1">
                    <span className="text-gray-500 text-xs flex-shrink-0 w-16">
                      {formatTime(log.timestamp)}
                    </span>
                    <span className="flex-shrink-0 w-4 text-center">
                      {getLevelPrefix(log.level)}
                    </span>
                    <span className={`${getLevelColor(log.level)} flex-shrink-0 w-16 text-xs`}>
                      [{log.source}]
                    </span>
                    <span className="text-gray-300 flex-1 break-words">
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugConsole; 