/**
 * Zustand store for translation history management
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { historyStorage, type TranslationHistoryItem } from '../lib/historyStorage'

interface HistoryState {
  // State
  items: TranslationHistoryItem[]
  isLoading: boolean
  error: string | null
  isInitialized: boolean

  // Actions
  initialize: () => Promise<void>
  addTranslation: (
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    imageHash?: string
  ) => Promise<void>
  removeTranslation: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
  searchHistory: (query: string) => Promise<TranslationHistoryItem[]>
  refreshHistory: () => Promise<void>
  exportHistory: () => Promise<TranslationHistoryItem[]>
  importHistory: (items: TranslationHistoryItem[]) => Promise<void>
  getStorageStats: () => Promise<{ itemCount: number; totalSize: number }>

  // UI state
  searchQuery: string
  filteredItems: TranslationHistoryItem[]
  setSearchQuery: (query: string) => void
  clearSearch: () => void
}

export const useHistoryStore = create<HistoryState>()(
  devtools(
    (set, get) => ({
      // Initial state
      items: [],
      isLoading: false,
      error: null,
      isInitialized: false,
      searchQuery: '',
      filteredItems: [],

      // Initialize the history store
      initialize: async () => {
        const state = get()
        if (state.isInitialized) {
          return
        }

        set({ isLoading: true, error: null }, false, 'history/initialize/start')

        try {
          await historyStorage.initialize()
          const items = await historyStorage.getRecentHistory()

          set(
            {
              items,
              filteredItems: items,
              isLoading: false,
              isInitialized: true,
            },
            false,
            'history/initialize/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize history'

          set(
            {
              error: errorMessage,
              isLoading: false,
              isInitialized: false,
            },
            false,
            'history/initialize/error'
          )

          console.error('History initialization failed:', error)
        }
      },

      // Add a new translation to history
      addTranslation: async (originalText, translatedText, sourceLanguage, targetLanguage, imageHash) => {
        set({ isLoading: true, error: null }, false, 'history/addTranslation/start')

        try {
          await historyStorage.addTranslation(originalText, translatedText, sourceLanguage, targetLanguage, imageHash)

          // Refresh the history to get updated list
          const items = await historyStorage.getRecentHistory()
          const { searchQuery } = get()

          set(
            {
              items,
              filteredItems: searchQuery ? items.filter(item =>
                item.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.translatedText.toLowerCase().includes(searchQuery.toLowerCase())
              ) : items,
              isLoading: false,
            },
            false,
            'history/addTranslation/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add translation'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'history/addTranslation/error'
          )

          console.error('Failed to add translation to history:', error)
          throw error
        }
      },

      // Remove a translation from history
      removeTranslation: async (id) => {
        set({ isLoading: true, error: null }, false, 'history/removeTranslation/start')

        try {
          await historyStorage.deleteHistoryItem(id)

          // Update local state
          const { items, searchQuery } = get()
          const updatedItems = items.filter(item => item.id !== id)

          set(
            {
              items: updatedItems,
              filteredItems: searchQuery ? updatedItems.filter(item =>
                item.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.translatedText.toLowerCase().includes(searchQuery.toLowerCase())
              ) : updatedItems,
              isLoading: false,
            },
            false,
            'history/removeTranslation/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to remove translation'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'history/removeTranslation/error'
          )

          console.error('Failed to remove translation from history:', error)
          throw error
        }
      },

      // Clear all history
      clearHistory: async () => {
        set({ isLoading: true, error: null }, false, 'history/clearHistory/start')

        try {
          await historyStorage.clearHistory()

          set(
            {
              items: [],
              filteredItems: [],
              searchQuery: '',
              isLoading: false,
            },
            false,
            'history/clearHistory/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to clear history'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'history/clearHistory/error'
          )

          console.error('Failed to clear history:', error)
          throw error
        }
      },

      // Search history
      searchHistory: async (query) => {
        set({ isLoading: true, error: null }, false, 'history/searchHistory/start')

        try {
          const results = await historyStorage.searchHistory(query)

          set(
            {
              isLoading: false,
            },
            false,
            'history/searchHistory/success'
          )

          return results
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to search history'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'history/searchHistory/error'
          )

          console.error('Failed to search history:', error)
          return []
        }
      },

      // Refresh history from storage
      refreshHistory: async () => {
        set({ isLoading: true, error: null }, false, 'history/refreshHistory/start')

        try {
          const items = await historyStorage.getRecentHistory()
          const { searchQuery } = get()

          set(
            {
              items,
              filteredItems: searchQuery ? items.filter(item =>
                item.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.translatedText.toLowerCase().includes(searchQuery.toLowerCase())
              ) : items,
              isLoading: false,
            },
            false,
            'history/refreshHistory/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to refresh history'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'history/refreshHistory/error'
          )

          console.error('Failed to refresh history:', error)
        }
      },

      // Export history
      exportHistory: async () => {
        set({ isLoading: true, error: null }, false, 'history/exportHistory/start')

        try {
          const items = await historyStorage.exportHistory()

          set(
            {
              isLoading: false,
            },
            false,
            'history/exportHistory/success'
          )

          return items
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to export history'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'history/exportHistory/error'
          )

          console.error('Failed to export history:', error)
          return []
        }
      },

      // Import history
      importHistory: async (items) => {
        set({ isLoading: true, error: null }, false, 'history/importHistory/start')

        try {
          await historyStorage.importHistory(items)

          // Refresh the history
          const updatedItems = await historyStorage.getRecentHistory()
          const { searchQuery } = get()

          set(
            {
              items: updatedItems,
              filteredItems: searchQuery ? updatedItems.filter(item =>
                item.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.translatedText.toLowerCase().includes(searchQuery.toLowerCase())
              ) : updatedItems,
              isLoading: false,
            },
            false,
            'history/importHistory/success'
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to import history'

          set(
            {
              error: errorMessage,
              isLoading: false,
            },
            false,
            'history/importHistory/error'
          )

          console.error('Failed to import history:', error)
          throw error
        }
      },

      // Get storage statistics
      getStorageStats: async () => {
        try {
          return await historyStorage.getStorageStats()
        } catch (error) {
          console.error('Failed to get storage stats:', error)
          return { itemCount: 0, totalSize: 0 }
        }
      },

      // UI state management
      setSearchQuery: (query) => {
        const { items } = get()
        const normalizedQuery = query.toLowerCase().trim()

        const filteredItems = normalizedQuery
          ? items.filter(
              item =>
                item.originalText.toLowerCase().includes(normalizedQuery) ||
                item.translatedText.toLowerCase().includes(normalizedQuery)
            )
          : items

        set(
          {
            searchQuery: query,
            filteredItems,
          },
          false,
          'history/setSearchQuery'
        )
      },

      clearSearch: () => {
        const { items } = get()

        set(
          {
            searchQuery: '',
            filteredItems: items,
          },
          false,
          'history/clearSearch'
        )
      },
    }),
    {
      name: 'history-store',
    }
  )
)