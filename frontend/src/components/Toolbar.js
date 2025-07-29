import React from 'react';
import { 
  FileText, 
  Share2, 
  MessageCircle, 
  Sun, 
  Moon, 
  Users,
  Download,
  Copy,
  Play
} from 'lucide-react';

const Toolbar = ({ 
  onNewDocument, 
  onShareDocument, 
  onToggleChat, 
  onToggleTheme, 
  onExecuteCode,
  theme, 
  showChat,
  isExecuting
}) => {
  return (
    <div className="flex items-center space-x-2">
      {/* New Document */}
      <ToolbarButton
        icon={<FileText className="w-4 h-4" />}
        label="New Document"
        onClick={onNewDocument}
        tooltip="Create a new document (Ctrl+N)"
      />

      {/* Share Document */}
      <ToolbarButton
        icon={<Share2 className="w-4 h-4" />}
        label="Share"
        onClick={onShareDocument}
        tooltip="Copy share link to clipboard"
      />

      {/* Execute Code */}
      <ToolbarButton
        icon={isExecuting ? (
          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        label={isExecuting ? "Running..." : "Run Code"}
        onClick={onExecuteCode}
        disabled={isExecuting}
        tooltip="Execute JavaScript code (Ctrl+Enter)"
      />

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300" />

      {/* Toggle Chat */}
      <ToolbarButton
        icon={<MessageCircle className="w-4 h-4" />}
        label="Chat"
        onClick={onToggleChat}
        isActive={showChat}
        tooltip="Toggle chat panel (Ctrl+Shift+C)"
      />

      {/* Theme Toggle */}
      <ToolbarButton
        icon={theme === 'vs-dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        label={theme === 'vs-dark' ? 'Light' : 'Dark'}
        onClick={onToggleTheme}
        tooltip="Toggle theme (Ctrl+Shift+T)"
      />

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300" />

      {/* Additional Actions */}
      <DropdownMenu />
    </div>
  );
};

const ToolbarButton = ({ icon, label, onClick, isActive, tooltip, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${isActive 
          ? 'bg-primary-100 text-primary-700 border border-primary-200' 
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
      `}
      title={tooltip}
      aria-label={tooltip}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};

const DropdownMenu = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleExportDocument = () => {
    // This would export the current document
    console.log('Export document');
    setIsOpen(false);
  };

  const handleCopyContent = async () => {
    // This would copy the document content to clipboard
    try {
      // In a real implementation, you'd get the content from the editor
      await navigator.clipboard.writeText('// Document content would be here');
      console.log('Content copied to clipboard');
    } catch (err) {
      console.error('Failed to copy content:', err);
    }
    setIsOpen(false);
  };

  const handleShowKeyboardShortcuts = () => {
    // This would show a modal with keyboard shortcuts
    alert(`Keyboard Shortcuts:
    
Ctrl+N - New Document
Ctrl+S - Save Document
Ctrl+Shift+C - Toggle Chat
Ctrl+Shift+T - Toggle Theme
Ctrl+Z - Undo
Ctrl+Shift+Z - Redo
Ctrl+F - Find
Ctrl+H - Find & Replace`);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-label="More options"
      >
        <span className="hidden sm:inline">More</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <DropdownItem
            icon={<Download className="w-4 h-4" />}
            label="Export Document"
            onClick={handleExportDocument}
          />
          <DropdownItem
            icon={<Copy className="w-4 h-4" />}
            label="Copy Content"
            onClick={handleCopyContent}
          />
          <div className="border-t border-gray-100 my-1" />
          <DropdownItem
            icon={<Users className="w-4 h-4" />}
            label="Keyboard Shortcuts"
            onClick={handleShowKeyboardShortcuts}
          />
        </div>
      )}
    </div>
  );
};

const DropdownItem = ({ icon, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default Toolbar;
