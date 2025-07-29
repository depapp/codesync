import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

const ConnectionStatus = ({ isConnected }) => {
  if (isConnected) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <Wifi className="w-4 h-4" />
        <span className="text-sm font-medium">Connected</span>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-red-600">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">Disconnected</span>
      <AlertCircle className="w-4 h-4" />
    </div>
  );
};

export default ConnectionStatus;
