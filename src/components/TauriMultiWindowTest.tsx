import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';

interface WindowInfo {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

const TauriMultiWindowTest: React.FC = () => {
  const [windows, setWindows] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWindowInfo, setCurrentWindowInfo] = useState<WindowInfo | null>(null);
  const [windowType, setWindowType] = useState<'main' | 'floating'>('main');

  const refreshWindowList = useCallback(async () => {
    try {
      const windowList = await invoke<string[]>('list_floating_windows');
      setWindows(windowList);
    } catch (err) {
      console.error('Failed to refresh window list:', err);
    }
  }, []);

  const createFloatingWindow = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const windowId = await invoke<string>('create_floating_window');
      console.log('Created floating window:', windowId);
      await refreshWindowList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create window');
    } finally {
      setIsLoading(false);
    }
  }, [refreshWindowList]);

  const closeFloatingWindow = useCallback(async (windowId: string) => {
    try {
      await invoke('close_floating_window', { windowId });
      await refreshWindowList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close window');
    }
  }, [refreshWindowList]);

  const updateWindowPosition = useCallback(async (windowId: string, x: number, y: number) => {
    try {
      await invoke('update_window_position', { windowId, x, y });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update position');
    }
  }, []);

  const updateWindowSize = useCallback(async (windowId: string, width: number, height: number) => {
    try {
      await invoke('update_window_size', { windowId, width, height });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update size');
    }
  }, []);

  useEffect(() => {
    refreshWindowList();

    // Listen for window type identification
    const setupWindowType = async () => {
      try {
        const unlisten = await listen('window-type', (event) => {
          if (event.payload === 'floating-panel') {
            setWindowType('floating');
          }
        });

        return unlisten;
      } catch (err) {
        console.error('Failed to setup window type listener:', err);
      }
    };

    setupWindowType();

    // Get current window information
    const getCurrentWindowInfo = async () => {
      try {
        const currentWindow = getCurrentWebviewWindow();
        const position = await currentWindow.outerPosition();
        const size = await currentWindow.outerSize();

        setCurrentWindowInfo({
          id: currentWindow.label,
          position: { x: position.x, y: position.y },
          size: { width: size.width, height: size.height }
        });
      } catch (err) {
        console.error('Failed to get current window info:', err);
      }
    };

    getCurrentWindowInfo();
  }, [refreshWindowList]);

  if (windowType === 'floating') {
    return (
      <div className="p-4 bg-blue-50 min-h-screen">
        <h2 className="text-xl font-bold mb-4 text-blue-800">Floating Panel</h2>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-2">This is a floating window!</p>
          <p className="text-xs text-gray-500">
            Window ID: {currentWindowInfo?.id}
          </p>
          <div className="mt-4 space-y-2">
            <div className="text-sm">
              <strong>Position:</strong> x: {currentWindowInfo?.position.x}, y: {currentWindowInfo?.position.y}
            </div>
            <div className="text-sm">
              <strong>Size:</strong> {currentWindowInfo?.size.width} × {currentWindowInfo?.size.height}
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => window.close()}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
            >
              Close This Window
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Tauri Multi-Window Test</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={createFloatingWindow}
          disabled={isLoading}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg mr-4"
        >
          {isLoading ? 'Creating...' : 'Create Floating Window'}
        </button>

        <button
          onClick={refreshWindowList}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
        >
          Refresh Window List
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Current Window Info</h3>
          {currentWindowInfo ? (
            <div className="space-y-2 text-sm">
              <div><strong>Window ID:</strong> {currentWindowInfo.id}</div>
              <div><strong>Position:</strong> ({currentWindowInfo.position.x}, {currentWindowInfo.position.y})</div>
              <div><strong>Size:</strong> {currentWindowInfo.size.width} × {currentWindowInfo.size.height}</div>
            </div>
          ) : (
            <div className="text-gray-500">Loading window information...</div>
          )}
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Floating Windows ({windows.length})</h3>
          {windows.length === 0 ? (
            <div className="text-gray-500">No floating windows open</div>
          ) : (
            <div className="space-y-3">
              {windows.map((windowId) => (
                <div key={windowId} className="bg-white p-3 rounded border">
                  <div className="text-sm font-medium mb-2">{windowId}</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => closeFloatingWindow(windowId)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => updateWindowPosition(windowId, Math.random() * 200 + 100, Math.random() * 200 + 100)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                    >
                      Random Position
                    </button>
                    <button
                      onClick={() => updateWindowSize(windowId, Math.random() * 200 + 300, Math.random() * 200 + 200)}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs"
                    >
                      Random Size
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">Multi-Window Test Features:</h4>
        <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>Create floating windows with always-on-top behavior</li>
          <li>Dynamic window positioning and resizing</li>
          <li>Window management (list, close, update)</li>
          <li>Cross-window communication via Tauri events</li>
          <li>Independent window lifecycle management</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 rounded border border-yellow-200">
        <h4 className="font-medium text-yellow-800 mb-2">Performance Considerations:</h4>
        <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
          <li>Each window creates a new webview instance (~20-50MB memory)</li>
          <li>Window creation time: typically 100-300ms</li>
          <li>Maximum recommended windows: 5-10 for good performance</li>
          <li>Always-on-top windows may impact system performance</li>
        </ul>
      </div>
    </div>
  );
};

export default TauriMultiWindowTest;