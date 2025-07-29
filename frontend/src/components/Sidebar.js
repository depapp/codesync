import React from 'react';
import { Users, Circle } from 'lucide-react';

const Sidebar = ({ users, currentUser }) => {
  const userList = Object.values(users || {});

  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">
            Active Users ({userList.length})
          </h2>
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {userList.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No users online</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {userList.map((user) => (
              <UserItem
                key={user.id}
                user={user}
                isCurrentUser={currentUser?.id === user.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Current User Info */}
      {currentUser && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium user-indicator"
              style={{ backgroundColor: currentUser.color }}
            >
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {currentUser.name} (You)
              </p>
              <p className="text-xs text-gray-500">
                ID: {currentUser.id.slice(0, 8)}...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UserItem = ({ user, isCurrentUser }) => {
  const getStatusText = (user) => {
    if (user.cursor) {
      return `Line ${user.cursor.lineNumber || user.cursor.line || 1}`;
    }
    return 'Idle';
  };

  const getLastActiveTime = (user) => {
    if (user.joinedAt) {
      const now = Date.now();
      const joined = new Date(user.joinedAt).getTime();
      const diff = now - joined;
      
      if (diff < 60000) { // Less than 1 minute
        return 'Just joined';
      } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
      } else {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
      }
    }
    return 'Recently';
  };

  const hasSelection = (selection) => {
    return selection && 
           (selection.startLineNumber !== selection.endLineNumber ||
            selection.startColumn !== selection.endColumn);
  };

  return (
    <div
      className={`p-3 rounded-lg transition-colors duration-200 ${
        isCurrentUser
          ? 'bg-primary-50 border border-primary-200'
          : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center space-x-3">
        {/* User Avatar */}
        <div className="relative">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium shadow-sm"
            style={{ backgroundColor: user.color }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          {/* Online indicator */}
          <div className="absolute -bottom-1 -right-1">
            <Circle className="w-4 h-4 text-green-500 fill-current" />
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.name}
              {isCurrentUser && (
                <span className="ml-1 text-xs text-primary-600 font-normal">
                  (You)
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">
              {getStatusText(user)}
            </p>
            <p className="text-xs text-gray-400">
              {getLastActiveTime(user)}
            </p>
          </div>

          {/* Cursor position indicator */}
          {user.cursor && (
            <div className="mt-2">
              <div className="flex items-center space-x-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: user.color }}
                />
                <span className="text-xs text-gray-500">
                  Col {user.cursor.column || user.cursor.ch || 1}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selection info */}
      {hasSelection(user.selection) && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <span>Selection:</span>
            <span className="font-mono">
              {user.selection.startLineNumber}:{user.selection.startColumn} - 
              {user.selection.endLineNumber}:{user.selection.endColumn}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
