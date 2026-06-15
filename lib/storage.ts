"use client"

import { useCallback, useEffect, useState } from "react"

const FAV_KEY = "komiku_favorites"
const HISTORY_KEY = "komiku_history"
const HISTORY_LIMIT = 50

export interface FavoriteItem {
  id: number
  name: string
  slug: string
  thumbnail?: string
  count: number
}

export interface HistoryItem {
  chapterId: number
  chapterNumber: string
  seriesTitle: string
  seriesId: number
  thumbnail?: string
  readAt: number
}

// Notify all hook instances in the same tab when storage changes.
const EVENT = "komiku-storage"

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT))
  }
}

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function write<T>(key: string, value: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    emit()
  } catch {
    // ignore quota / private mode errors
  }
}

function useStored<T>(key: string): [T[], (next: T[]) => void, boolean] {
  const [items, setItems] = useState<T[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sync = () => setItems(read<T>(key))
    sync()
    setReady(true)
    window.addEventListener(EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [key])

  const update = useCallback(
    (next: T[]) => {
      setItems(next)
      write(key, next)
    },
    [key],
  )

  return [items, update, ready]
}

export function useFavorites() {
  const [favorites, setFavorites, ready] = useStored<FavoriteItem>(FAV_KEY)

  const isFavorite = useCallback((id: number) => favorites.some((f) => f.id === id), [favorites])

  const toggleFavorite = useCallback(
    (item: FavoriteItem) => {
      const exists = favorites.some((f) => f.id === item.id)
      if (exists) {
        setFavorites(favorites.filter((f) => f.id !== item.id))
      } else {
        setFavorites([item, ...favorites])
      }
    },
    [favorites, setFavorites],
  )

  const removeFavorite = useCallback(
    (id: number) => setFavorites(favorites.filter((f) => f.id !== id)),
    [favorites, setFavorites],
  )

  return { favorites, isFavorite, toggleFavorite, removeFavorite, ready }
}

export function useHistory() {
  const [history, setHistory, ready] = useStored<HistoryItem>(HISTORY_KEY)

  const clearHistory = useCallback(() => setHistory([]), [setHistory])

  const removeHistory = useCallback(
    (chapterId: number) => setHistory(history.filter((h) => h.chapterId !== chapterId)),
    [history, setHistory],
  )

  const sorted = [...history].sort((a, b) => b.readAt - a.readAt)

  return { history: sorted, clearHistory, removeHistory, ready }
}

// Imperative save used by the reader (outside React state of the list pages).
export function saveHistory(item: Omit<HistoryItem, "readAt">) {
  if (typeof window === "undefined") return
  const current = read<HistoryItem>(HISTORY_KEY)
  const filtered = current.filter((h) => h.chapterId !== item.chapterId)
  const next = [{ ...item, readAt: Date.now() }, ...filtered].slice(0, HISTORY_LIMIT)
  write(HISTORY_KEY, next)
}
