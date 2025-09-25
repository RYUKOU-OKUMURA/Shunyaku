/**
 * Window state storage service
 * Manages window positions, sizes, and states for the floating panel and main window
 */

interface WindowState {
  x: number
  y: number
  width: number
  height: number
  isMaximized?: boolean
  isMinimized?: boolean
  isVisible?: boolean
}

interface WindowStates {
  mainWindow: WindowState
  floatingPanel: WindowState
  settingsModal: WindowState
}

interface WindowBounds {
  minWidth: number
  minHeight: number
  maxWidth?: number
  maxHeight?: number
}

class WindowStateStorageService {
  private readonly storageKey = 'shunyaku-window-states'
  private readonly metadataKey = 'shunyaku-window-metadata'

  private readonly defaultStates: WindowStates = {
    mainWindow: {
      x: 100,
      y: 100,
      width: 800,
      height: 600,
      isMaximized: false,
      isMinimized: false,
      isVisible: true,
    },
    floatingPanel: {
      x: 200,
      y: 200,
      width: 400,
      height: 300,
      isMaximized: false,
      isMinimized: false,
      isVisible: false,
    },
    settingsModal: {
      x: 150,
      y: 150,
      width: 600,
      height: 500,
      isMaximized: false,
      isMinimized: false,
      isVisible: false,
    },
  }

  private readonly windowBounds: Record<keyof WindowStates, WindowBounds> = {
    mainWindow: {
      minWidth: 400,
      minHeight: 300,
    },
    floatingPanel: {
      minWidth: 250,
      minHeight: 150,
      maxWidth: 800,
      maxHeight: 600,
    },
    settingsModal: {
      minWidth: 500,
      minHeight: 400,
      maxWidth: 1000,
      maxHeight: 800,
    },
  }

  /**
   * Load window states from storage
   */
  async loadWindowStates(): Promise<WindowStates> {
    try {
      const statesJson = localStorage.getItem(this.storageKey)

      if (!statesJson) {
        console.info('No window states found, using defaults')
        return this.getDefaultStates()
      }

      const states = JSON.parse(statesJson) as WindowStates

      // Validate and sanitize loaded states
      return this.validateAndSanitizeStates(states)
    } catch (error) {
      console.error('Failed to load window states:', error)
      return this.getDefaultStates()
    }
  }

  /**
   * Save window states to storage
   */
  async saveWindowStates(states: WindowStates): Promise<void> {
    try {
      const validatedStates = this.validateAndSanitizeStates(states)
      const statesJson = JSON.stringify(validatedStates, null, 2)

      localStorage.setItem(this.storageKey, statesJson)

      const metadata = {
        lastSaved: Date.now(),
        version: 1,
      }

      localStorage.setItem(this.metadataKey, JSON.stringify(metadata))

      console.debug('Window states saved successfully')
    } catch (error) {
      console.error('Failed to save window states:', error)
      throw new Error(`Window state save failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update specific window state
   */
  async updateWindowState(windowId: keyof WindowStates, state: Partial<WindowState>): Promise<void> {
    const currentStates = await this.loadWindowStates()
    const currentWindowState = currentStates[windowId]

    const updatedState: WindowState = {
      ...currentWindowState,
      ...state,
    }

    // Validate the updated state
    const validatedState = this.validateWindowState(windowId, updatedState)

    const updatedStates = {
      ...currentStates,
      [windowId]: validatedState,
    }

    await this.saveWindowStates(updatedStates)
  }

  /**
   * Get specific window state
   */
  async getWindowState(windowId: keyof WindowStates): Promise<WindowState> {
    const states = await this.loadWindowStates()
    return states[windowId]
  }

  /**
   * Reset window states to defaults
   */
  async resetWindowStates(): Promise<WindowStates> {
    const defaultStates = this.getDefaultStates()
    await this.saveWindowStates(defaultStates)
    return defaultStates
  }

  /**
   * Reset specific window state to default
   */
  async resetWindowState(windowId: keyof WindowStates): Promise<WindowState> {
    const currentStates = await this.loadWindowStates()
    const defaultState = this.defaultStates[windowId]

    const updatedStates = {
      ...currentStates,
      [windowId]: { ...defaultState },
    }

    await this.saveWindowStates(updatedStates)
    return defaultState
  }

  /**
   * Check if window state is within screen boundaries
   */
  isWindowOnScreen(state: WindowState): boolean {
    if (typeof window === 'undefined' || !window.screen) {
      return true // Cannot validate in non-browser environment
    }

    const { screen } = window
    const screenWidth = screen.width
    const screenHeight = screen.height

    // Check if window is at least partially visible
    const windowRight = state.x + state.width
    const windowBottom = state.y + state.height

    return (
      state.x < screenWidth &&
      windowRight > 0 &&
      state.y < screenHeight &&
      windowBottom > 0
    )
  }

  /**
   * Adjust window state to fit within screen boundaries
   */
  fitWindowToScreen(windowId: keyof WindowStates, state: WindowState): WindowState {
    if (typeof window === 'undefined' || !window.screen) {
      return state // Cannot adjust in non-browser environment
    }

    const { screen } = window
    const screenWidth = screen.width
    const screenHeight = screen.height
    const bounds = this.windowBounds[windowId]

    let { x, y, width, height } = state

    // Ensure minimum size
    width = Math.max(width, bounds.minWidth)
    height = Math.max(height, bounds.minHeight)

    // Ensure maximum size if specified
    if (bounds.maxWidth) {
      width = Math.min(width, bounds.maxWidth)
    }
    if (bounds.maxHeight) {
      height = Math.min(height, bounds.maxHeight)
    }

    // Ensure window fits within screen
    width = Math.min(width, screenWidth)
    height = Math.min(height, screenHeight)

    // Adjust position to keep window on screen
    x = Math.max(0, Math.min(x, screenWidth - width))
    y = Math.max(0, Math.min(y, screenHeight - height))

    return { ...state, x, y, width, height }
  }

  /**
   * Center window on screen
   */
  centerWindowOnScreen(
    windowId: keyof WindowStates,
    state: WindowState
  ): WindowState {
    if (typeof window === 'undefined' || !window.screen) {
      return state
    }

    const { screen } = window
    const screenWidth = screen.width
    const screenHeight = screen.height

    const x = Math.max(0, (screenWidth - state.width) / 2)
    const y = Math.max(0, (screenHeight - state.height) / 2)

    return { ...state, x, y }
  }

  /**
   * Export window states for backup
   */
  async exportWindowStates(): Promise<{ states: WindowStates; metadata: any }> {
    const states = await this.loadWindowStates()
    const metadataJson = localStorage.getItem(this.metadataKey)
    const metadata = metadataJson ? JSON.parse(metadataJson) : { lastSaved: Date.now(), version: 1 }

    return { states, metadata }
  }

  /**
   * Import window states from backup
   */
  async importWindowStates(backup: { states: WindowStates; metadata: any }): Promise<void> {
    try {
      const { states } = backup
      const validatedStates = this.validateAndSanitizeStates(states)
      await this.saveWindowStates(validatedStates)
    } catch (error) {
      console.error('Failed to import window states:', error)
      throw new Error(`Window states import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private getDefaultStates(): WindowStates {
    return JSON.parse(JSON.stringify(this.defaultStates))
  }

  private validateAndSanitizeStates(states: Partial<WindowStates>): WindowStates {
    const sanitized: WindowStates = this.getDefaultStates()

    Object.keys(this.defaultStates).forEach((windowId) => {
      const id = windowId as keyof WindowStates
      if (states[id]) {
        sanitized[id] = this.validateWindowState(id, states[id]!)
      }
    })

    return sanitized
  }

  private validateWindowState(windowId: keyof WindowStates, state: WindowState): WindowState {
    const bounds = this.windowBounds[windowId]
    const validated = { ...state }

    // Validate numeric values
    validated.x = typeof state.x === 'number' ? Math.max(0, state.x) : this.defaultStates[windowId].x
    validated.y = typeof state.y === 'number' ? Math.max(0, state.y) : this.defaultStates[windowId].y

    validated.width = typeof state.width === 'number' ? Math.max(bounds.minWidth, state.width) : this.defaultStates[windowId].width
    validated.height = typeof state.height === 'number' ? Math.max(bounds.minHeight, state.height) : this.defaultStates[windowId].height

    // Apply maximum bounds if specified
    if (bounds.maxWidth) {
      validated.width = Math.min(validated.width, bounds.maxWidth)
    }
    if (bounds.maxHeight) {
      validated.height = Math.min(validated.height, bounds.maxHeight)
    }

    // Validate boolean values
    validated.isMaximized = typeof state.isMaximized === 'boolean' ? state.isMaximized : false
    validated.isMinimized = typeof state.isMinimized === 'boolean' ? state.isMinimized : false
    validated.isVisible = typeof state.isVisible === 'boolean' ? state.isVisible : this.defaultStates[windowId].isVisible

    // Ensure window is on screen
    if (this.isWindowOnScreen(validated)) {
      return validated
    }

    return this.fitWindowToScreen(windowId, validated)
  }
}

// Singleton instance
export const windowStateStorage = new WindowStateStorageService()
export type { WindowState, WindowStates, WindowBounds }