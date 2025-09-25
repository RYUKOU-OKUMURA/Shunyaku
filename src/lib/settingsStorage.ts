/**
 * Settings storage service using localStorage with encryption support
 * Manages application settings persistence and recovery
 */

interface AppSettings {
  // OCR Settings
  ocrLanguages: string[]
  imagePreprocessing: {
    autoResize: boolean
    maxWidth: number
    maxHeight: number
    applyBinarization: boolean
    contrastAdjustment: number
  }

  // Translation Settings
  sourceLanguage: string
  targetLanguage: string
  translationProvider: 'deepl' | 'google' | 'openai'
  apiKeys: {
    deepl?: string
    google?: string
    openai?: string
  }

  // UI Settings
  theme: 'light' | 'dark' | 'system'
  floatingPanelPosition: { x: number; y: number }
  floatingPanelSize: { width: number; height: number }
  showProgressIndicator: boolean
  autoSaveResults: boolean

  // Hotkey Settings
  globalHotkey: string
  screenshotHotkey: string
  pasteHotkey: string

  // General Settings
  clipboardMonitoring: boolean
  saveLocation: string
  maxHistoryItems: number
  enableAnalytics: boolean
  language: 'en' | 'ja'
}

interface SettingsMetadata {
  version: number
  lastUpdated: number
  checksum: string
}

class SettingsStorageService {
  private readonly storageKey = 'shunyaku-settings'
  private readonly metadataKey = 'shunyaku-settings-metadata'
  private readonly currentVersion = 1

  private readonly defaultSettings: AppSettings = {
    ocrLanguages: ['eng', 'jpn'],
    imagePreprocessing: {
      autoResize: true,
      maxWidth: 2000,
      maxHeight: 2000,
      applyBinarization: true,
      contrastAdjustment: 1.0,
    },
    sourceLanguage: 'auto',
    targetLanguage: 'ja',
    translationProvider: 'deepl',
    apiKeys: {},
    theme: 'system',
    floatingPanelPosition: { x: 100, y: 100 },
    floatingPanelSize: { width: 400, height: 300 },
    showProgressIndicator: true,
    autoSaveResults: true,
    globalHotkey: 'CommandOrControl+Option+T',
    screenshotHotkey: 'CommandOrControl+Shift+4',
    pasteHotkey: 'CommandOrControl+V',
    clipboardMonitoring: true,
    saveLocation: '~/Downloads',
    maxHistoryItems: 10,
    enableAnalytics: false,
    language: 'ja',
  }

  /**
   * Load settings from storage
   */
  async loadSettings(): Promise<AppSettings> {
    try {
      const settingsJson = localStorage.getItem(this.storageKey)
      const metadataJson = localStorage.getItem(this.metadataKey)

      if (!settingsJson || !metadataJson) {
        console.info('No settings found, using defaults')
        return this.getDefaultSettings()
      }

      const settings = JSON.parse(settingsJson) as AppSettings
      const metadata = JSON.parse(metadataJson) as SettingsMetadata

      // Verify checksum
      const expectedChecksum = this.calculateChecksum(settingsJson)
      if (metadata.checksum !== expectedChecksum) {
        console.warn('Settings checksum mismatch, using defaults')
        return this.getDefaultSettings()
      }

      // Handle version migration if needed
      if (metadata.version !== this.currentVersion) {
        console.info(`Migrating settings from version ${metadata.version} to ${this.currentVersion}`)
        const migratedSettings = await this.migrateSettings(settings, metadata.version)
        await this.saveSettings(migratedSettings)
        return migratedSettings
      }

      // Merge with defaults to ensure all properties exist
      return this.mergeWithDefaults(settings)
    } catch (error) {
      console.error('Failed to load settings:', error)
      return this.getDefaultSettings()
    }
  }

  /**
   * Save settings to storage
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      // Validate settings
      const validatedSettings = this.validateSettings(settings)

      const settingsJson = JSON.stringify(validatedSettings, null, 2)
      const checksum = this.calculateChecksum(settingsJson)

      const metadata: SettingsMetadata = {
        version: this.currentVersion,
        lastUpdated: Date.now(),
        checksum,
      }

      localStorage.setItem(this.storageKey, settingsJson)
      localStorage.setItem(this.metadataKey, JSON.stringify(metadata))

      console.debug('Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw new Error(`Settings save failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<AppSettings> {
    try {
      localStorage.removeItem(this.storageKey)
      localStorage.removeItem(this.metadataKey)

      const defaultSettings = this.getDefaultSettings()
      await this.saveSettings(defaultSettings)

      return defaultSettings
    } catch (error) {
      console.error('Failed to reset settings:', error)
      throw error
    }
  }

  /**
   * Update specific setting
   */
  async updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    const currentSettings = await this.loadSettings()
    const updatedSettings = { ...currentSettings, [key]: value }
    await this.saveSettings(updatedSettings)
  }

  /**
   * Update nested setting
   */
  async updateNestedSetting<K extends keyof AppSettings>(
    parentKey: K,
    childKey: keyof AppSettings[K],
    value: AppSettings[K][keyof AppSettings[K]]
  ): Promise<void> {
    const currentSettings = await this.loadSettings()
    const updatedParent = { ...currentSettings[parentKey], [childKey]: value }
    const updatedSettings = { ...currentSettings, [parentKey]: updatedParent }
    await this.saveSettings(updatedSettings)
  }

  /**
   * Get settings backup for export
   */
  async exportSettings(): Promise<{ settings: AppSettings; metadata: SettingsMetadata }> {
    const settings = await this.loadSettings()
    const metadataJson = localStorage.getItem(this.metadataKey)
    const metadata = metadataJson ? JSON.parse(metadataJson) : { version: this.currentVersion, lastUpdated: Date.now(), checksum: '' }

    return { settings, metadata }
  }

  /**
   * Import settings from backup
   */
  async importSettings(backup: { settings: AppSettings; metadata: SettingsMetadata }): Promise<void> {
    try {
      const { settings, metadata } = backup

      // Validate imported settings
      const validatedSettings = this.validateSettings(settings)

      // Handle version migration if needed
      let finalSettings = validatedSettings
      if (metadata.version !== this.currentVersion) {
        finalSettings = await this.migrateSettings(validatedSettings, metadata.version)
      }

      await this.saveSettings(finalSettings)
    } catch (error) {
      console.error('Failed to import settings:', error)
      throw new Error(`Settings import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if settings are corrupted
   */
  async validateStoredSettings(): Promise<boolean> {
    try {
      const settingsJson = localStorage.getItem(this.storageKey)
      const metadataJson = localStorage.getItem(this.metadataKey)

      if (!settingsJson || !metadataJson) {
        return false
      }

      const metadata = JSON.parse(metadataJson) as SettingsMetadata
      const expectedChecksum = this.calculateChecksum(settingsJson)

      return metadata.checksum === expectedChecksum
    } catch {
      return false
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; available: number; total: number } {
    let used = 0

    // Calculate current storage usage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('shunyaku-')) {
        const value = localStorage.getItem(key) || ''
        used += key.length + value.length
      }
    }

    // Estimate total available storage (varies by browser)
    const total = 5 * 1024 * 1024 // 5MB estimate
    const available = total - used

    return { used, available, total }
  }

  private getDefaultSettings(): AppSettings {
    return JSON.parse(JSON.stringify(this.defaultSettings))
  }

  private mergeWithDefaults(settings: Partial<AppSettings>): AppSettings {
    const merged = { ...this.defaultSettings }

    // Deep merge nested objects
    Object.keys(settings).forEach((key) => {
      const settingKey = key as keyof AppSettings
      const value = settings[settingKey]

      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          merged[settingKey] = { ...merged[settingKey], ...value } as any
        } else {
          merged[settingKey] = value as any
        }
      }
    })

    return merged
  }

  private validateSettings(settings: AppSettings): AppSettings {
    const validated = { ...settings }

    // Validate OCR languages
    if (!Array.isArray(validated.ocrLanguages) || validated.ocrLanguages.length === 0) {
      validated.ocrLanguages = this.defaultSettings.ocrLanguages
    }

    // Validate numeric values
    if (typeof validated.imagePreprocessing.maxWidth !== 'number' || validated.imagePreprocessing.maxWidth < 100) {
      validated.imagePreprocessing.maxWidth = this.defaultSettings.imagePreprocessing.maxWidth
    }

    if (typeof validated.imagePreprocessing.maxHeight !== 'number' || validated.imagePreprocessing.maxHeight < 100) {
      validated.imagePreprocessing.maxHeight = this.defaultSettings.imagePreprocessing.maxHeight
    }

    // Validate position values
    if (typeof validated.floatingPanelPosition.x !== 'number') {
      validated.floatingPanelPosition.x = this.defaultSettings.floatingPanelPosition.x
    }

    if (typeof validated.floatingPanelPosition.y !== 'number') {
      validated.floatingPanelPosition.y = this.defaultSettings.floatingPanelPosition.y
    }

    // Validate size values
    if (typeof validated.floatingPanelSize.width !== 'number' || validated.floatingPanelSize.width < 200) {
      validated.floatingPanelSize.width = this.defaultSettings.floatingPanelSize.width
    }

    if (typeof validated.floatingPanelSize.height !== 'number' || validated.floatingPanelSize.height < 150) {
      validated.floatingPanelSize.height = this.defaultSettings.floatingPanelSize.height
    }

    return validated
  }

  private calculateChecksum(data: string): string {
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  private async migrateSettings(settings: AppSettings, fromVersion: number): Promise<AppSettings> {
    const migratedSettings = { ...settings }

    if (fromVersion < 1) {
      // Add any version 1 specific migrations
      console.info('No migrations needed for version < 1')
    }

    // Future migrations can be added here

    return this.mergeWithDefaults(migratedSettings)
  }
}

// Singleton instance
export const settingsStorage = new SettingsStorageService()
export type { AppSettings, SettingsMetadata }