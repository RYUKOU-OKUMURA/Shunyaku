/**
 * Translation History Search Component
 * Provides search functionality for translation history with real-time filtering
 */

import React, { useState, useCallback, useEffect } from 'react'
import { shallow } from 'zustand/shallow'
import { useHistoryStore } from '../store/useHistoryStore'
import type { TranslationHistoryItem } from '../lib/historyStorage'

interface TranslationHistorySearchProps {
  className?: string
  onItemSelect?: (item: TranslationHistoryItem) => void
  placeholder?: string
  maxResults?: number
  showTimestamp?: boolean
  showLanguages?: boolean
}

export const TranslationHistorySearch: React.FC<TranslationHistorySearchProps> = ({
  className = '',
  onItemSelect,
  placeholder = '検索キーワードを入力...',
  maxResults = 10,
  showTimestamp = true,
  showLanguages = true,
}) => {
  const {
    searchQuery,
    filteredItems,
    isLoading,
    error,
    setSearchQuery,
    clearSearch,
    initialize,
    isInitialized,
  } = useHistoryStore(
    state => ({
      searchQuery: state.searchQuery,
      filteredItems: state.filteredItems,
      isLoading: state.isLoading,
      error: state.error,
      setSearchQuery: state.setSearchQuery,
      clearSearch: state.clearSearch,
      initialize: state.initialize,
      isInitialized: state.isInitialized,
    }),
    shallow
  )

  const [isExpanded, setIsExpanded] = useState(false)
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const resultsId = `search-results-${Math.random().toString(36).slice(2, 11)}`

  // Initialize store if not already initialized
  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [initialize, isInitialized])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [localQuery, setSearchQuery])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalQuery(value)
    setIsExpanded(value.length > 0 || filteredItems.length > 0)
    setFocusedIndex(-1)
  }, [filteredItems.length])

  const handleInputFocus = useCallback(() => {
    setIsExpanded(true)
    setFocusedIndex(-1)
  }, [])

  const handleInputBlur = useCallback(() => {
    // Delay hiding to allow item selection
    setTimeout(() => {
      if (!localQuery && filteredItems.length === 0) {
        setIsExpanded(false)
      }
    }, 200)
  }, [localQuery, filteredItems.length])

  const handleItemClick = useCallback((item: TranslationHistoryItem, _index: number) => {
    onItemSelect?.(item)
    setIsExpanded(false)
    setLocalQuery('')
    clearSearch()
    setFocusedIndex(-1)
  }, [onItemSelect, clearSearch])

  const handleClearSearch = useCallback(() => {
    setLocalQuery('')
    clearSearch()
    setIsExpanded(false)
    setFocusedIndex(-1)
  }, [clearSearch])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isExpanded || displayedItems.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => Math.min(prev + 1, displayedItems.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => Math.max(prev - 1, -1))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < displayedItems.length) {
          handleItemClick(displayedItems[focusedIndex], focusedIndex)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsExpanded(false)
        setFocusedIndex(-1)
        break
    }
  }, [isExpanded, displayedItems, focusedIndex, handleItemClick])

  const displayedItems = filteredItems.slice(0, maxResults)

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return '数分前'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}時間前`
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}日前`
    } else {
      return date.toLocaleDateString('ja-JP')
    }
  }

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          role="combobox"
          value={localQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          disabled={isLoading}
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? resultsId : undefined}
          aria-haspopup="listbox"
          aria-activedescendant={focusedIndex >= 0 ? `${resultsId}-item-${focusedIndex}` : undefined}
        />

        {/* Search Icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {localQuery ? (
            <button
              onClick={handleClearSearch}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
              aria-label="検索条件をクリア"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-y-0 right-8 flex items-center pr-3" role="status" aria-label="検索中">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="sr-only">検索中...</span>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isExpanded && (
        <div
          id={resultsId}
          role="listbox"
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {error && (
            <div className="px-4 py-2 text-red-600 bg-red-50" role="alert">
              エラー: {error}
            </div>
          )}

          {!error && displayedItems.length === 0 && localQuery && (
            <div className="px-4 py-3 text-gray-500 text-center">
              「{localQuery}」に関する履歴が見つかりませんでした
            </div>
          )}

          {!error && displayedItems.length === 0 && !localQuery && (
            <div className="px-4 py-3 text-gray-500 text-center">
              履歴がありません
            </div>
          )}

          {!error && displayedItems.map((item, index) => (
            <div
              key={item.id}
              id={`${resultsId}-item-${index}`}
              role="option"
              tabIndex={0}
              onClick={() => handleItemClick(item, index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleItemClick(item, index)
                }
              }}
              className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
                index === displayedItems.length - 1 ? 'border-b-0' : ''
              } ${
                index === focusedIndex ? 'bg-blue-50 border-blue-200' : ''
              }`}
              aria-selected={index === focusedIndex}
            >
              <div className="space-y-2">
                {/* Original Text */}
                <div className="text-sm text-gray-600">
                  <span className="font-medium">原文:</span>
                  <span className="ml-2">{truncateText(item.originalText)}</span>
                </div>

                {/* Translated Text */}
                <div className="text-sm text-gray-900">
                  <span className="font-medium">翻訳:</span>
                  <span className="ml-2">{truncateText(item.translatedText)}</span>
                </div>

                {/* Metadata */}
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <div className="flex space-x-3">
                    {showLanguages && (
                      <span>
                        {item.sourceLanguage} → {item.targetLanguage}
                      </span>
                    )}
                    {showTimestamp && (
                      <span>{formatTimestamp(item.timestamp)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Show more indicator */}
          {filteredItems.length > maxResults && (
            <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50">
              さらに {filteredItems.length - maxResults} 件の結果があります
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TranslationHistorySearch