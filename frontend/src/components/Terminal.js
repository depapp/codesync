import React, { useRef, useEffect } from 'react';

const Terminal = ({ output, isExecuting, onClear, isVisible }) => {
  const terminalRef = useRef(null);

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="ml-2 text-sm font-medium text-gray-300">Terminal</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {isExecuting && (
            <div className="flex items-center space-x-2 text-yellow-400">
              <div className="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
              <span className="text-sm">Executing...</span>
            </div>
          )}
          
          <button
            onClick={onClear}
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            disabled={isExecuting}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={terminalRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm leading-relaxed"
        style={{ minHeight: '200px' }}
      >
        {output.length === 0 ? (
          <div className="text-gray-500 italic">
            Click "Run Code" to execute JavaScript and see output here...
          </div>
        ) : (
          <div className="space-y-1">
            {output.map((line, index) => (
              <div key={index} className={getLineClassName(line.type)}>
                {line.type === 'command' && <span className="text-blue-400">$ </span>}
                {line.type === 'error' && <span className="text-red-400">✗ </span>}
                {line.type === 'success' && <span className="text-green-400">✓ </span>}
                <span className="whitespace-pre-wrap">{line.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const getLineClassName = (type) => {
  switch (type) {
    case 'command':
      return 'text-blue-300';
    case 'output':
      return 'text-gray-100';
    case 'error':
      return 'text-red-300';
    case 'success':
      return 'text-green-300';
    case 'info':
      return 'text-yellow-300';
    default:
      return 'text-gray-100';
  }
};

export default Terminal;
