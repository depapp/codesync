import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import Toolbar from './components/Toolbar';
import Terminal from './components/Terminal';
import ConnectionStatus from './components/ConnectionStatus';
import UserModal from './components/UserModal';
import socketService from './services/socket';
import './index.css';

function App() {
  const [documentId, setDocumentId] = useState('');
  const [user, setUser] = useState(null);
  const [document, setDocument] = useState(null);
  const [users, setUsers] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [showUserModal, setShowUserModal] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [theme, setTheme] = useState('vs-dark');
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  useEffect(() => {
    // Get document ID from URL or generate new one
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('doc') || uuidv4();
    setDocumentId(docId);

    // Update URL if needed
    if (!urlParams.get('doc')) {
      const newUrl = `${window.location.pathname}?doc=${docId}`;
      window.history.replaceState({}, '', newUrl);
    }

    // Connect to socket server
    socketService.connect();

    // Set up event listeners
    socketService.on('connection:status', handleConnectionStatus);
    socketService.on('document:loaded', handleDocumentLoaded);
    socketService.on('document:change', handleRemoteDocumentChange);
    socketService.on('user:presence', handleUserPresence);
    socketService.on('cursor:update', handleCursorUpdate);
    socketService.on('chat:message', handleChatMessage);
    socketService.on('connection:error', handleConnectionError);

    return () => {
      socketService.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnectionStatus = ({ connected }) => {
    setIsConnected(connected);
  };

  const handleDocumentLoaded = ({ document, users: roomUsers, userId }) => {
    console.log('📄 App received document:loaded:', {
      document,
      roomUsers,
      userId
    });
    setDocument(document);
    setUsers(roomUsers);
    setUser(prev => ({ ...prev, id: userId }));
  };

  const handleRemoteDocumentChange = ({ content, userId: changeUserId, operation, timestamp }) => {
    console.log('📝 Received document change:', {
      changeUserId,
      currentUserId: user?.id,
      userExists: !!user,
      contentLength: content?.length,
      timestamp
    });
    
    // Always update if we don't have a user yet (still loading)
    // Or if the change came from a different user
    const shouldUpdate = !user || !user.id || changeUserId !== user.id;
    
    if (shouldUpdate) {
      console.log('✅ Updating document content from remote change');
      setDocument(prev => {
        if (!prev) {
          return { content, lastModified: timestamp };
        }
        return { ...prev, content, lastModified: timestamp };
      });
    } else {
      console.log('❌ Ignoring document change (same user)', {
        changeUserId,
        currentUserId: user.id,
        match: changeUserId === user.id
      });
    }
  };

  const handleUserPresence = ({ type, user: presenceUser }) => {
    if (type === 'user:joined') {
      setUsers(prev => ({
        ...prev,
        [presenceUser.id]: presenceUser
      }));
    } else if (type === 'user:left') {
      setUsers(prev => {
        const newUsers = { ...prev };
        delete newUsers[presenceUser.id];
        return newUsers;
      });
    }
  };

  const handleCursorUpdate = ({ userId, position, selection }) => {
    if (user && userId !== user.id) {
      setUsers(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          cursor: position,
          selection
        }
      }));
    }
  };

  const handleChatMessage = (message) => {
    setChatMessages(prev => [...prev, message]);
  };

  const handleConnectionError = (error) => {
    console.error('Connection error:', error);
  };

  const handleUserSubmit = (userData) => {
    const userInfo = {
      ...userData,
      id: uuidv4()
    };
    setUser(userInfo);
    setShowUserModal(false);

    // Join the document room
    socketService.joinDocument(documentId, userInfo);
  };

  const handleDocumentChange = (content, operation) => {
    console.log('📝 App handling document change:', {
      contentLength: content?.length,
      operation: operation?.type,
      userId: user?.id
    });
    
    // Update local document state immediately for responsive UI
    setDocument(prev => ({ ...prev, content }));
    
    // Debounce socket updates to prevent rapid-fire sending
    if (handleDocumentChange.timeout) {
      clearTimeout(handleDocumentChange.timeout);
    }
    
    handleDocumentChange.timeout = setTimeout(() => {
      console.log('📤 Sending debounced document change to server');
      socketService.sendDocumentChange(content, operation);
    }, 100); // Increased to 100ms debounce for better stability
  };

  const handleCursorChange = (position, selection) => {
    socketService.sendCursorUpdate(position, selection);
  };

  const handleSendMessage = (message) => {
    socketService.sendChatMessage(message);
  };

  const handleNewDocument = () => {
    const newDocId = uuidv4();
    const newUrl = `${window.location.pathname}?doc=${newDocId}`;
    window.location.href = newUrl;
  };

  const handleShareDocument = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Document URL copied to clipboard!');
    });
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'vs-dark' ? 'light' : 'vs-dark');
  };

  const handleExecuteCode = useCallback(async () => {
    if (!document?.content || isExecuting) return;

    setIsExecuting(true);
    setShowTerminal(true);

    // Add command to terminal output
    setTerminalOutput(prev => [
      ...prev,
      {
        type: 'command',
        content: 'Executing JavaScript code...'
      }
    ]);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5002';
      const response = await fetch(`${apiUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: document.content
        })
      });

      const result = await response.json();

      // Log execution result for debugging
      console.log('Code execution result:', result);

      if (result.success) {
        // Add output to terminal
        setTerminalOutput(prev => [
          ...prev,
          ...result.output,
          {
            type: 'success',
            content: `✓ Executed successfully in ${result.executionTime}ms`
          }
        ]);
      } else {
        // Add error to terminal
        setTerminalOutput(prev => [
          ...prev,
          ...result.output,
          {
            type: 'error',
            content: `✗ Execution failed in ${result.executionTime}ms`
          }
        ]);
      }
    } catch (error) {
      setTerminalOutput(prev => [
        ...prev,
        {
          type: 'error',
          content: `✗ Network error: ${error.message}`
        }
      ]);
    } finally {
      setIsExecuting(false);
    }
  }, [document?.content, isExecuting]);

  const handleClearTerminal = () => {
    setTerminalOutput([]);
  };


  if (showUserModal) {
    return <UserModal onSubmit={handleUserSubmit} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">
              CodeSync
            </h1>
            <ConnectionStatus isConnected={isConnected} />
          </div>
          
          <Toolbar
            onNewDocument={handleNewDocument}
            onShareDocument={handleShareDocument}
            onToggleChat={() => setShowChat(!showChat)}
            onToggleTheme={toggleTheme}
            onExecuteCode={handleExecuteCode}
            theme={theme}
            showChat={showChat}
            isExecuting={isExecuting}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden h-full">
        {/* Sidebar */}
        <div className="flex-shrink-0 h-full">
          <Sidebar users={users} currentUser={user} />
        </div>

        {/* Editor and Terminal */}
        <div className="flex-1 min-w-0 h-full flex flex-col">
          {/* Editor */}
          <div className={`${showTerminal ? 'flex-1' : 'h-full'} min-h-0`}>
            {document && (
              <Editor
                document={document}
                users={users}
                currentUser={user}
                theme={theme}
                onDocumentChange={handleDocumentChange}
                onCursorChange={handleCursorChange}
              />
            )}
          </div>
          
          {/* Terminal */}
          {showTerminal && (
            <div className="h-64 border-t border-gray-200">
              <Terminal
                output={terminalOutput}
                isExecuting={isExecuting}
                onClear={handleClearTerminal}
                isVisible={showTerminal}
              />
            </div>
          )}
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="flex-shrink-0 h-full">
            <Chat
              messages={chatMessages}
              currentUser={user}
              onSendMessage={handleSendMessage}
              onClose={() => setShowChat(false)}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Document: {documentId.slice(0, 8)}...</span>
            <span>Users: {Object.keys(users).length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Powered by Redis</span>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
