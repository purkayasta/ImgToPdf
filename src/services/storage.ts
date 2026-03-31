const StorageService = {
  get<T>(key: string): T | null {
    const item = localStorage.getItem(key)
    if (item === null) return null
    try {
      return JSON.parse(item) as T
    } catch {
      return null
    }
  },

  // Single method for both create and update — localStorage.setItem is always an upsert
  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value))
  },

  remove(key: string): void {
    localStorage.removeItem(key)
  },
}

export default StorageService
