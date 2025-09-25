/**
 * Zustand store for window state management
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { windowStateStorage, type WindowState, type WindowStates } from '../lib/windowStateStorage'

interface WindowStoreState {
  // State
  windowStates: WindowStates
  isLoading: boolean
  error: string | null
  isInitialized: boolean

  // Actions
  initialize: () => Promise<void>
  updateWindowState: (windowId: keyof WindowStates, state: Partial<WindowState>) => Promise<void>
  getWindowState: (windowId: keyof WindowStates) => WindowState
  resetWindowState: (windowId: keyof WindowStates) => Promise<void>
  resetAllWindowStates: () => Promise<void>
  centerWindow: (windowId: keyof WindowStates) => Promise<void>
  fitWindowToScreen: (windowId: keyof WindowStates) => Promise<void>

  // Window visibility management
  showWindow: (windowId: keyof WindowStates) => Promise<void>
  hideWindow: (windowId: keyof WindowStates) => Promise<void>
  toggleWindow: (windowId: keyof WindowStates) => Promise<void>

  // Batch operations
  saveAllWindowStates: () => Promise<void>
  exportWindowStates: () => Promise<{ states: WindowStates; metadata: any }>
  importWindowStates: (backup: { states: WindowStates; metadata: any }) => Promise<void>

  // UI helpers
  isWindowVisible: (windowId: keyof WindowStates) => boolean
  isWindowOnScreen: (windowId: keyof WindowStates) => boolean
  getWindowBounds: (windowId: keyof WindowStates) => { x: number; y: number; width: number; height: number }
}

export const useWindowStore = create<WindowStoreState>()(
  devtools(
    (set, get) => ({
      // Initial state
      windowStates: {} as WindowStates, // Will be populated on initialize
      isLoading: false,
      error: null,
      isInitialized: false,

      // Initialize the window store
      initialize: async () => {
        const state = get()
        if (state.isInitialized) {
          return
        }

        set({ isLoading: true, error: null }, false, 'window/initialize/start')

        try {
          const windowStates = await windowStateStorage.loadWindowStates()

          set(
            {
              windowStates,
              isLoading: false,
              isInitialized: true,
            },
            false,
            'window/initialize/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize window states'

          set(
            {
              error: errorMessage,
              isLoading: false,
              isInitialized: false,
            },
            false,
            'window/initialize/error'
          )

          console.error('Window states initialization failed:', error)
        }
      },

      // Update a specific window state
      updateWindowState: async (windowId, state) => {
        set({ isLoading: true, error: null }, false, 'window/updateWindowState/start')

        try {
          await windowStateStorage.updateWindowState(windowId, state)

          // Update local state
          const { windowStates } = get()
          const currentWindowState = windowStates[windowId]
          const updatedWindowState = { ...currentWindowState, ...state }
          const updatedWindowStates = { ...windowStates, [windowId]: updatedWindowState }

          set(
            {
              windowStates: updatedWindowStates,
              isLoading: false,
            },
            false,
            'window/updateWindowState/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update window state'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'window/updateWindowState/error'
          )

          console.error('Failed to update window state:', error)
          throw error
        }
      },

      // Get a specific window state
      getWindowState: (windowId) => {
        const { windowStates } = get()
        return windowStates[windowId]
      },

      // Reset a specific window state to default
      resetWindowState: async (windowId) => {
        set({ isLoading: true, error: null }, false, 'window/resetWindowState/start')

        try {
          const defaultState = await windowStateStorage.resetWindowState(windowId)

          // Update local state
          const { windowStates } = get()
          const updatedWindowStates = { ...windowStates, [windowId]: defaultState }

          set(
            {
              windowStates: updatedWindowStates,
              isLoading: false,
            },
            false,
            'window/resetWindowState/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reset window state'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'window/resetWindowState/error'
          )

          console.error('Failed to reset window state:', error)
          throw error
        }
      },

      // Reset all window states to defaults
      resetAllWindowStates: async () => {
        set({ isLoading: true, error: null }, false, 'window/resetAllWindowStates/start')

        try {
          const defaultStates = await windowStateStorage.resetWindowStates()

          set(
            {
              windowStates: defaultStates,
              isLoading: false,
            },
            false,
            'window/resetAllWindowStates/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reset all window states'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'window/resetAllWindowStates/error'
          )

          console.error('Failed to reset all window states:', error)
          throw error
        }
      },

      // Center window on screen
      centerWindow: async (windowId) => {
        const { windowStates } = get()
        const currentState = windowStates[windowId]
        const centeredState = windowStateStorage.centerWindowOnScreen(windowId, currentState)

        await get().updateWindowState(windowId, centeredState)
      },

      // Fit window to screen boundaries
      fitWindowToScreen: async (windowId) => {
        const { windowStates } = get()
        const currentState = windowStates[windowId]
        const fittedState = windowStateStorage.fitWindowToScreen(windowId, currentState)

        await get().updateWindowState(windowId, fittedState)
      },

      // Show window
      showWindow: async (windowId) => {
        await get().updateWindowState(windowId, { isVisible: true })
      },

      // Hide window
      hideWindow: async (windowId) => {
        await get().updateWindowState(windowId, { isVisible: false })
      },

      // Toggle window visibility
      toggleWindow: async (windowId) => {
        const { windowStates } = get()
        const currentState = windowStates[windowId]
        const newVisibility = !currentState.isVisible

        await get().updateWindowState(windowId, { isVisible: newVisibility })
      },

      // Save all window states
      saveAllWindowStates: async () => {
        set({ isLoading: true, error: null }, false, 'window/saveAllWindowStates/start')

        try {
          const { windowStates } = get()
          await windowStateStorage.saveWindowStates(windowStates)

          set(
            {
              isLoading: false,
            },
            false,
            'window/saveAllWindowStates/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to save window states'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'window/saveAllWindowStates/error'
          )

          console.error('Failed to save all window states:', error)
          throw error
        }
      },

      // Export window states
      exportWindowStates: async () => {
        set({ isLoading: true, error: null }, false, 'window/exportWindowStates/start')

        try {
          const backup = await windowStateStorage.exportWindowStates()

          set(
            {
              isLoading: false,
            },
            false,
            'window/exportWindowStates/success'
          )

          return backup
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to export window states'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'window/exportWindowStates/error'
          )

          console.error('Failed to export window states:', error)
          throw error
        }
      },

      // Import window states
      importWindowStates: async (backup) => {
        set({ isLoading: true, error: null }, false, 'window/importWindowStates/start')

        try {
          await windowStateStorage.importWindowStates(backup)

          // Reload window states from storage
          const updatedWindowStates = await windowStateStorage.loadWindowStates()

          set(
            {
              windowStates: updatedWindowStates,
              isLoading: false,
            },
            false,
            'window/importWindowStates/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to import window states'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'window/importWindowStates/error'
          )

          console.error('Failed to import window states:', error)
          throw error
        }
      },

      // UI helpers
      isWindowVisible: (windowId) => {
        const { windowStates } = get()
        return windowStates[windowId]?.isVisible ?? false
      },

      isWindowOnScreen: (windowId) => {
        const { windowStates } = get()
        const state = windowStates[windowId]
        return state ? windowStateStorage.isWindowOnScreen(state) : false
      },

      getWindowBounds: (windowId) => {
        const { windowStates } = get()
        const state = windowStates[windowId]
        return {
          x: state?.x ?? 0,
          y: state?.y ?? 0,
          width: state?.width ?? 400,
          height: state?.height ?? 300,
        }
      },
    }),
    {
      name: 'window-store',
    }
  )
)