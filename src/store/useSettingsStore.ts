/**
 * Zustand store for application settings management
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { settingsStorage, type AppSettings } from '../lib/settingsStorage'

interface SettingsState {
  // State
  settings: AppSettings
  isLoading: boolean
  error: string | null
  isInitialized: boolean
  hasUnsavedChanges: boolean

  // Actions
  initialize: () => Promise<void>
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
  updateNestedSetting: <K extends keyof AppSettings>(
    parentKey: K,
    childKey: keyof AppSettings[K],
    value: AppSettings[K][keyof AppSettings[K]]
  ) => Promise<void>
  resetSettings: () => Promise<void>
  resetSetting: <K extends keyof AppSettings>(key: K) => Promise<void>
  saveSettings: () => Promise<void>
  discardChanges: () => Promise<void>
  exportSettings: () => Promise<{ settings: AppSettings; metadata: any }>
  importSettings: (backup: { settings: AppSettings; metadata: any }) => Promise<void>
  validateStoredSettings: () => Promise<boolean>

  // Computed getters
  getStorageInfo: () => { used: number; available: number; total: number }

  // UI helpers
  markAsChanged: () => void
  markAsSaved: () => void
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      settings: {} as AppSettings, // Will be populated on initialize
      isLoading: false,
      error: null,
      isInitialized: false,
      hasUnsavedChanges: false,

      // Initialize the settings store
      initialize: async () => {
        const state = get()
        if (state.isInitialized) {
          return
        }

        set({ isLoading: true, error: null }, false, 'settings/initialize/start')

        try {
          const settings = await settingsStorage.loadSettings()

          set(
            {
              settings,
              isLoading: false,
              isInitialized: true,
              hasUnsavedChanges: false,
            },
            false,
            'settings/initialize/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize settings'

          set(
            {
              error: errorMessage,
              isLoading: false,
              isInitialized: false,
            },
            false,
            'settings/initialize/error'
          )

          console.error('Settings initialization failed:', error)
        }
      },

      // Update a single setting
      updateSetting: async (key, value) => {
        set({ isLoading: true, error: null }, false, 'settings/updateSetting/start')

        try {
          await settingsStorage.updateSetting(key, value)

          // Update local state
          const { settings } = get()
          const updatedSettings = { ...settings, [key]: value }

          set(
            {
              settings: updatedSettings,
              isLoading: false,
              hasUnsavedChanges: false,
            },
            false,
            'settings/updateSetting/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update setting'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'settings/updateSetting/error'
          )

          console.error('Failed to update setting:', error)
          throw error
        }
      },

      // Update a nested setting
      updateNestedSetting: async (parentKey, childKey, value) => {
        set({ isLoading: true, error: null }, false, 'settings/updateNestedSetting/start')

        try {
          await settingsStorage.updateNestedSetting(parentKey, childKey, value)

          // Update local state
          const { settings } = get()
          const updatedParent = { ...settings[parentKey], [childKey]: value }
          const updatedSettings = { ...settings, [parentKey]: updatedParent }

          set(
            {
              settings: updatedSettings,
              isLoading: false,
              hasUnsavedChanges: false,
            },
            false,
            'settings/updateNestedSetting/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update nested setting'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'settings/updateNestedSetting/error'
          )

          console.error('Failed to update nested setting:', error)
          throw error
        }
      },

      // Reset all settings to defaults
      resetSettings: async () => {
        set({ isLoading: true, error: null }, false, 'settings/resetSettings/start')

        try {
          const defaultSettings = await settingsStorage.resetSettings()

          set(
            {
              settings: defaultSettings,
              isLoading: false,
              hasUnsavedChanges: false,
            },
            false,
            'settings/resetSettings/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reset settings'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'settings/resetSettings/error'
          )

          console.error('Failed to reset settings:', error)
          throw error
        }
      },

      // Reset a specific setting to default
      resetSetting: async (key) => {
        set({ isLoading: true, error: null }, false, 'settings/resetSetting/start')

        try {
          // Load defaults and get the default value for this key
          const currentSettings = await settingsStorage.loadSettings()
          const defaultSettings = await settingsStorage.resetSettings()
          const defaultValue = defaultSettings[key]

          // Restore current settings and update only the specific key
          await settingsStorage.saveSettings({ ...currentSettings, [key]: defaultValue })

          // Update local state
          const { settings } = get()
          const updatedSettings = { ...settings, [key]: defaultValue }

          set(
            {
              settings: updatedSettings,
              isLoading: false,
              hasUnsavedChanges: false,
            },
            false,
            'settings/resetSetting/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reset setting'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'settings/resetSetting/error'
          )

          console.error('Failed to reset setting:', error)
          throw error
        }
      },

      // Save current settings
      saveSettings: async () => {
        set({ isLoading: true, error: null }, false, 'settings/saveSettings/start')

        try {
          const { settings } = get()
          await settingsStorage.saveSettings(settings)

          set(
            {
              isLoading: false,
              hasUnsavedChanges: false,
            },
            false,
            'settings/saveSettings/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to save settings'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'settings/saveSettings/error'
          )

          console.error('Failed to save settings:', error)
          throw error
        }
      },

      // Discard unsaved changes
      discardChanges: async () => {
        set({ isLoading: true, error: null }, false, 'settings/discardChanges/start')

        try {
          const savedSettings = await settingsStorage.loadSettings()

          set(
            {
              settings: savedSettings,
              isLoading: false,
              hasUnsavedChanges: false,
            },
            false,
            'settings/discardChanges/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to discard changes'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'settings/discardChanges/error'
          )

          console.error('Failed to discard changes:', error)
          throw error
        }
      },

      // Export settings
      exportSettings: async () => {
        set({ isLoading: true, error: null }, false, 'settings/exportSettings/start')

        try {
          const backup = await settingsStorage.exportSettings()

          set(
            {
              isLoading: false,
            },
            false,
            'settings/exportSettings/success'
          )

          return backup
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to export settings'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'settings/exportSettings/error'
          )

          console.error('Failed to export settings:', error)
          throw error
        }
      },

      // Import settings
      importSettings: async (backup) => {
        set({ isLoading: true, error: null }, false, 'settings/importSettings/start')

        try {
          await settingsStorage.importSettings(backup)

          // Reload settings from storage
          const updatedSettings = await settingsStorage.loadSettings()

          set(
            {
              settings: updatedSettings,
              isLoading: false,
              hasUnsavedChanges: false,
            },
            false,
            'settings/importSettings/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to import settings'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'settings/importSettings/error'
          )

          console.error('Failed to import settings:', error)
          throw error
        }
      },

      // Validate stored settings
      validateStoredSettings: async () => {
        try {
          return await settingsStorage.validateStoredSettings()
        } catch (error) {
          console.error('Failed to validate stored settings:', error)
          return false
        }
      },

      // Get storage information
      getStorageInfo: () => {
        return settingsStorage.getStorageInfo()
      },

      // UI helpers
      markAsChanged: () => {
        set({ hasUnsavedChanges: true }, false, 'settings/markAsChanged')
      },

      markAsSaved: () => {
        set({ hasUnsavedChanges: false }, false, 'settings/markAsSaved')
      },
    }),
    {
      name: 'settings-store',
    }
  )
)