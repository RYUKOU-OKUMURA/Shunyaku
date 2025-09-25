/**
 * IndexedDB based history storage service
 * Manages translation history with a maximum of 10 recent items
 */

interface TranslationHistoryItem {
  id: string
  originalText: string
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
  timestamp: number
  imageHash?: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface HistoryMetadata {
  version: number
  lastCleanup: number
}

class HistoryStorageService {
  private dbName = 'ShunyakuHistory'
  private dbVersion = 1
  private historyStore = 'history'
  private metadataStore = 'metadata'
  private maxItems = 10

  private db: IDBDatabase | null = null

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    if (this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create history store
        if (!db.objectStoreNames.contains(this.historyStore)) {
          const historyStore = db.createObjectStore(this.historyStore, {
            keyPath: 'id',
          })
          historyStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(this.metadataStore)) {
          db.createObjectStore(this.metadataStore, { keyPath: 'key' })
        }
      }
    })
  }

  /**
   * Add a new translation to history
   */
  async addTranslation(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    imageHash?: string
  ): Promise<void> {
    await this.initialize()

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const item: TranslationHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      originalText: originalText.trim(),
      translatedText: translatedText.trim(),
      sourceLanguage,
      targetLanguage,
      timestamp: Date.now(),
      imageHash,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.historyStore], 'readwrite')
      const store = transaction.objectStore(this.historyStore)

      const request = store.add(item)

      request.onsuccess = async () => {
        await this.cleanupOldEntries()
        resolve()
      }

      request.onerror = () => {
        reject(new Error(`Failed to add history item: ${request.error?.message}`))
      }
    })
  }

  /**
   * Get recent translation history (up to maxItems)
   */
  async getRecentHistory(): Promise<TranslationHistoryItem[]> {
    await this.initialize()

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.historyStore], 'readonly')
      const store = transaction.objectStore(this.historyStore)
      const index = store.index('timestamp')

      const request = index.openCursor(null, 'prev') // Descending order
      const items: TranslationHistoryItem[] = []

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && items.length < this.maxItems) {
          items.push(cursor.value)
          cursor.continue()
        } else {
          resolve(items)
        }
      }

      request.onerror = () => {
        reject(new Error(`Failed to retrieve history: ${request.error?.message}`))
      }
    })
  }

  /**
   * Search history by text content
   */
  async searchHistory(query: string): Promise<TranslationHistoryItem[]> {
    await this.initialize()

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const allItems = await this.getRecentHistory()
    const normalizedQuery = query.toLowerCase().trim()

    return allItems.filter(
      (item) =>
        item.originalText.toLowerCase().includes(normalizedQuery) ||
        item.translatedText.toLowerCase().includes(normalizedQuery)
    )
  }

  /**
   * Delete a specific history item
   */
  async deleteHistoryItem(id: string): Promise<void> {
    await this.initialize()

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.historyStore], 'readwrite')
      const store = transaction.objectStore(this.historyStore)

      const request = store.delete(id)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error(`Failed to delete history item: ${request.error?.message}`))
      }
    })
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    await this.initialize()

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.historyStore], 'readwrite')
      const store = transaction.objectStore(this.historyStore)

      const request = store.clear()

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error(`Failed to clear history: ${request.error?.message}`))
      }
    })
  }

  /**
   * Remove old entries to maintain maximum item count
   */
  private async cleanupOldEntries(): Promise<void> {
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.historyStore], 'readwrite')
      const store = transaction.objectStore(this.historyStore)
      const index = store.index('timestamp')

      const request = index.openCursor(null, 'prev')
      const itemsToDelete: string[] = []
      let count = 0

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          count++
          if (count > this.maxItems) {
            itemsToDelete.push(cursor.value.id)
          }
          cursor.continue()
        } else {
          // Delete old entries
          const deletePromises = itemsToDelete.map(
            (id) =>
              new Promise<void>((deleteResolve, deleteReject) => {
                const deleteRequest = store.delete(id)
                deleteRequest.onsuccess = () => deleteResolve()
                deleteRequest.onerror = () =>
                  deleteReject(new Error(`Failed to delete old entry: ${deleteRequest.error?.message}`))
              })
          )

          Promise.all(deletePromises)
            .then(() => resolve())
            .catch(reject)
        }
      }

      request.onerror = () => {
        reject(new Error(`Failed to cleanup old entries: ${request.error?.message}`))
      }
    })
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{ itemCount: number; totalSize: number }> {
    await this.initialize()

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.historyStore], 'readonly')
      const store = transaction.objectStore(this.historyStore)

      const request = store.getAll()

      request.onsuccess = () => {
        const items = request.result
        const totalSize = JSON.stringify(items).length
        resolve({
          itemCount: items.length,
          totalSize,
        })
      }

      request.onerror = () => {
        reject(new Error(`Failed to get storage stats: ${request.error?.message}`))
      }
    })
  }

  /**
   * Export history for backup
   */
  async exportHistory(): Promise<TranslationHistoryItem[]> {
    return this.getRecentHistory()
  }

  /**
   * Import history from backup (replaces current history)
   */
  async importHistory(items: TranslationHistoryItem[]): Promise<void> {
    await this.initialize()

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    await this.clearHistory()

    // Add items one by one to maintain order and apply cleanup
    const sortedItems = items.sort((a, b) => b.timestamp - a.timestamp).slice(0, this.maxItems)

    for (const item of sortedItems) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([this.historyStore], 'readwrite')
        const store = transaction.objectStore(this.historyStore)

        const request = store.add(item)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(new Error(`Failed to import item: ${request.error?.message}`))
      })
    }
  }
}

// Singleton instance
export const historyStorage = new HistoryStorageService()
export type { TranslationHistoryItem }