
/**
 * Generic Storage Helper
 * Abstracts the localStorage implementation details.
 * In the future, this can be replaced or augmented with Supabase client logic.
 */

export const StorageService = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      console.error(`Error reading ${key} from storage`, e);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing ${key} to storage`, e);
    }
  },

  update: <T>(key: string, updateFn: (current: T) => T, defaultValue: T): T => {
    const current = StorageService.get<T>(key, defaultValue);
    const updated = updateFn(current);
    StorageService.set(key, updated);
    return updated;
  }
};
