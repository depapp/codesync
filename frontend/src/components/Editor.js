import React, { useRef, useEffect, useState, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';

const Editor = ({ document, users, currentUser, theme, onDocumentChange, onCursorChange }) => {
  const editorRef = useRef(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [cursors, setCursors] = useState({});
  const [selections, setSelections] = useState({});
  const isUpdatingFromRemote = useRef(false);
  const lastRemoteContent = useRef('');

  useEffect(() => {
    if (isEditorReady && editorRef.current && document?.content !== undefined) {
      const currentContent = editorRef.current.getValue();
      
      console.log('📝 Editor content sync check:', {
        documentContent: document.content?.length,
        currentContent: currentContent?.length,
        contentMatch: document.content === currentContent,
        isEditorReady,
        isUpdatingFromRemote: isUpdatingFromRemote.current,
        lastRemoteContent: lastRemoteContent.current?.length
      });
      
      // Only update if:
      // 1. Content actually changed
      // 2. We're not currently updating from a remote change
      // 3. This is a new remote content (different from last remote update)
      const shouldUpdate = document.content !== currentContent && 
                          !isUpdatingFromRemote.current &&
                          document.content !== lastRemoteContent.current;
      
      if (shouldUpdate) {
        console.log('🔄 Updating editor content from remote document change');
        
        // Set flag to prevent feedback loop
        isUpdatingFromRemote.current = true;
        lastRemoteContent.current = document.content;
        
        // Save current cursor position
        const position = editorRef.current.getPosition();
        const selection = editorRef.current.getSelection();
        
        // Update content
        editorRef.current.setValue(document.content);
        
        // Restore cursor position if possible
        try {
          if (position) {
            editorRef.current.setPosition(position);
          }
          if (selection) {
            editorRef.current.setSelection(selection);
          }
        } catch (error) {
          console.warn('Could not restore cursor position:', error);
        }
        
        // Reset flag after a short delay
        setTimeout(() => {
          isUpdatingFromRemote.current = false;
        }, 100);
      } else if (document.content === currentContent) {
        // Content matches, just update our tracking
        lastRemoteContent.current = document.content;
      }
    }
  }, [document?.content, isEditorReady]);

  const updateCursorsAndSelections = useCallback(() => {
    if (!editorRef.current || !currentUser) return;

    const editor = editorRef.current;
    const monaco = editor.getModel().constructor.monaco || window.monaco;

    // Clear existing decorations
    Object.values(cursors).forEach(decoration => {
      if (decoration) {
        editor.deltaDecorations([decoration], []);
      }
    });

    Object.values(selections).forEach(decoration => {
      if (decoration) {
        editor.deltaDecorations([decoration], []);
      }
    });

    const newCursors = {};
    const newSelections = {};

    // Add cursors and selections for other users
    Object.values(users).forEach(user => {
      if (user.id === currentUser.id) return;

      if (user.cursor) {
        // Add cursor decoration
        const cursorDecoration = {
          range: new monaco.Range(
            user.cursor.lineNumber,
            user.cursor.column,
            user.cursor.lineNumber,
            user.cursor.column
          ),
          options: {
            className: 'cursor-indicator',
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            beforeContentClassName: 'cursor-before',
            afterContentClassName: 'cursor-after',
            glyphMarginClassName: 'cursor-glyph',
            overviewRuler: {
              color: user.color,
              position: monaco.editor.OverviewRulerLane.Full
            }
          }
        };

        const cursorDecorationIds = editor.deltaDecorations([], [cursorDecoration]);
        newCursors[user.id] = cursorDecorationIds[0];

        // Add selection decoration if user has selection
        if (user.selection && !user.selection.isEmpty()) {
          const selectionDecoration = {
            range: new monaco.Range(
              user.selection.startLineNumber,
              user.selection.startColumn,
              user.selection.endLineNumber,
              user.selection.endColumn
            ),
            options: {
              className: 'selection-highlight',
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              backgroundColor: user.color + '40', // Add transparency
              overviewRuler: {
                color: user.color,
                position: monaco.editor.OverviewRulerLane.Center
              }
            }
          };

          const selectionDecorationIds = editor.deltaDecorations([], [selectionDecoration]);
          newSelections[user.id] = selectionDecorationIds[0];
        }
      }
    });

    setCursors(newCursors);
    setSelections(newSelections);
  }, [users, currentUser, cursors, selections]);

  useEffect(() => {
    if (isEditorReady && editorRef.current) {
      updateCursorsAndSelections();
    }
  }, [users, isEditorReady, updateCursorsAndSelections]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    setIsEditorReady(true);

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      theme: theme,
      minimap: { enabled: true },
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: true,
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      unfoldOnClickAfterEndOfLine: false,
      contextmenu: true,
      mouseWheelZoom: true,
      multiCursorModifier: 'ctrlCmd',
      accessibilitySupport: 'auto'
    });

    // Set up event listeners
    editor.onDidChangeModelContent((e) => {
      // Skip if we're currently updating from remote changes
      if (isUpdatingFromRemote.current) {
        console.log('⏭️ Skipping content change event - updating from remote');
        return;
      }
      
      const content = editor.getValue();
      const operation = {
        type: 'content-change',
        changes: e.changes,
        position: editor.getPosition()
      };
      
      console.log('📝 Editor content changed by user:', {
        contentLength: content?.length,
        changesCount: e.changes?.length,
        isUpdatingFromRemote: isUpdatingFromRemote.current
      });
      
      onDocumentChange(content, operation);
    });

    editor.onDidChangeCursorPosition((e) => {
      if (currentUser) {
        onCursorChange(e.position, editor.getSelection());
      }
    });

    editor.onDidChangeCursorSelection((e) => {
      if (currentUser) {
        onCursorChange(editor.getPosition(), e.selection);
      }
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Save functionality (could be extended)
      console.log('Document saved');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
      editor.trigger('keyboard', 'undo', {});
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
      editor.trigger('keyboard', 'redo', {});
    });

    // Focus the editor
    editor.focus();
  };

  const getLanguageFromContent = (content) => {
    // Simple language detection based on content
    if (content.includes('function') || content.includes('const') || content.includes('let')) {
      return 'javascript';
    }
    if (content.includes('def ') || content.includes('import ')) {
      return 'python';
    }
    if (content.includes('#include') || content.includes('int main')) {
      return 'cpp';
    }
    if (content.includes('public class') || content.includes('import java')) {
      return 'java';
    }
    if (content.includes('<html') || content.includes('<!DOCTYPE')) {
      return 'html';
    }
    if (content.includes('body {') || content.includes('.class')) {
      return 'css';
    }
    return 'javascript'; // Default
  };

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-white relative">
      <MonacoEditor
        height="100%"
        language={getLanguageFromContent(document.content)}
        defaultValue={document.content}
        theme={theme}
        onMount={handleEditorDidMount}
        options={{
          selectOnLineNumbers: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
          lineNumbers: 'on',
          minimap: { enabled: true },
          wordWrap: 'on',
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,
          folding: true,
          contextmenu: true,
          mouseWheelZoom: true,
          multiCursorModifier: 'ctrlCmd',
          accessibilitySupport: 'auto',
          ariaLabel: 'Code editor for collaborative editing'
        }}
      />

      {/* User cursors overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {Object.entries(users).map(([userId, user]) => {
          if (userId === currentUser?.id || !user.cursor) return null;

          return (
            <div
              key={userId}
              className="cursor-indicator"
              style={{
                backgroundColor: user.color,
                left: `${user.cursor.column * 7}px`, // Approximate character width
                top: `${user.cursor.lineNumber * 20}px` // Approximate line height
              }}
              data-user={user.name}
            />
          );
        })}
      </div>

      {/* Loading overlay */}
      {!isEditorReady && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <div className="spinner mb-2"></div>
            <p className="text-sm text-gray-600">Initializing editor...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
