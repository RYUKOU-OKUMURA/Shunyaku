import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FloatingPanelProps } from '../types';

const FloatingPanel: React.FC<FloatingPanelProps> = ({
  visible,
  content,
  onClose,
  onSave,
  position = { x: 100, y: 100 },
  className = '',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(position);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Handle dragging
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!panelRef.current || isResizing) return;

    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    setIsDragging(true);
    event.preventDefault();
  }, [isResizing]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging && panelRef.current) {
      const newX = event.clientX - dragOffset.x;
      const newY = event.clientY - dragOffset.y;

      // Keep panel within screen bounds
      const maxX = window.innerWidth - dimensions.width;
      const maxY = window.innerHeight - dimensions.height;

      setCurrentPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  }, [isDragging, dragOffset, dimensions]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Handle resizing
  const handleResizeMouseDown = useCallback((event: React.MouseEvent) => {
    setIsResizing(true);
    event.stopPropagation();
    event.preventDefault();
  }, []);

  const handleResizeMouseMove = useCallback((event: MouseEvent) => {
    if (isResizing && panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      const newWidth = Math.max(300, event.clientX - rect.left);
      const newHeight = Math.max(200, event.clientY - rect.top);

      setDimensions({ width: newWidth, height: newHeight });
    }
  }, [isResizing]);

  // Add global event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleResizeMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleResizeMouseMove, handleMouseUp]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && visible) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-20"
        onClick={onClose}
      />

      {/* Floating panel */}
      <div
        ref={panelRef}
        className={`fixed bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col ${className}`}
        style={{
          left: currentPosition.x,
          top: currentPosition.y,
          width: dimensions.width,
          height: dimensions.height,
          cursor: isDragging ? 'grabbing' : 'default',
        }}
      >
        {/* Header */}
        <div
          ref={headerRef}
          className="flex items-center justify-between p-4 border-b border-gray-200 cursor-grab active:cursor-grabbing bg-gray-50 rounded-t-lg"
          onMouseDown={handleMouseDown}
        >
          <h3 className="text-lg font-semibold text-gray-900">Translation Result</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Save translation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(content)}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
              title="Copy to clipboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Close panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap text-gray-800 font-sans leading-relaxed">
              {content}
            </pre>
          </div>
        </div>

        {/* Resize handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize"
          onMouseDown={handleResizeMouseDown}
        >
          <svg
            className="w-4 h-4 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M14 16v-2h2v2h-2zm0-4v-2h2v2h-2zm0-4V6h2v2h-2zm-4 8v-2h2v2h-2zm0-4v-2h2v2h-2zm0-4V6h2v2h-2zm-4 8v-2h2v2h-2zm0-4v-2h2v2h-2z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default FloatingPanel;