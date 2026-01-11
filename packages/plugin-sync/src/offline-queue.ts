import { SyncEvent } from './index';

/**
 * Offline queue options
 */
export interface OfflineQueueOptions {
  /**
   * Maximum queue size
   */
  maxSize?: number;

  /**
   * Storage key prefix
   */
  storagePrefix?: string;

  /**
   * Use localStorage instead of memory
   */
  persistent?: boolean;
}

/**
 * Offline event queue for storing pending sync events
 */
export class OfflineQueue {
  private queue: SyncEvent[] = [];
  private maxSize: number;
  private storagePrefix: string;
  private persistent: boolean;
  private storageAvailable: boolean;

  constructor(options: OfflineQueueOptions = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.storagePrefix = options.storagePrefix ?? 'nebula-sync-queue';
    this.persistent = options.persistent ?? false;
    this.storageAvailable = this.checkStorageAvailability();

    if (this.persistent && this.storageAvailable) {
      this.loadFromStorage();
    }
  }

  /**
   * Check if localStorage is available
   */
  private checkStorageAvailability(): boolean {
    try {
      if (typeof window === 'undefined') {
        return false;
      }

      const test = '__nebula_storage_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage key
   */
  private getStorageKey(): string {
    return `${this.storagePrefix}-events`;
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    if (!this.storageAvailable) return;

    try {
      const stored = window.localStorage.getItem(this.getStorageKey());
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue from storage', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    if (!this.persistent || !this.storageAvailable) return;

    try {
      window.localStorage.setItem(this.getStorageKey(), JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue to storage', error);
    }
  }

  /**
   * Add event to queue
   */
  add(event: SyncEvent): boolean {
    if (this.queue.length >= this.maxSize) {
      console.warn('Offline queue is full, oldest event will be removed');
      this.queue.shift();
    }

    this.queue.push(event);
    this.saveToStorage();
    return true;
  }

  /**
   * Add multiple events to queue
   */
  addAll(events: SyncEvent[]): number {
    let added = 0;
    for (const event of events) {
      if (this.add(event)) {
        added++;
      }
    }
    return added;
  }

  /**
   * Get all events in queue
   */
  getAll(): SyncEvent[] {
    return [...this.queue];
  }

  /**
   * Get events for collection
   */
  getByCollection(collection: string): SyncEvent[] {
    return this.queue.filter(event => event.collection === collection);
  }

  /**
   * Get events by type
   */
  getByType(type: 'insert' | 'update' | 'delete'): SyncEvent[] {
    return this.queue.filter(event => event.type === type);
  }

  /**
   * Remove event from queue
   */
  remove(eventId: string): boolean {
    const index = this.queue.findIndex(event => event.id === eventId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Remove events from queue
   */
  removeAll(eventIds: string[]): number {
    let removed = 0;
    for (const eventId of eventIds) {
      if (this.remove(eventId)) {
        removed++;
      }
    }
    return removed;
  }

  /**
   * Clear all events from queue
   */
  clear(): number {
    const count = this.queue.length;
    this.queue = [];
    this.saveToStorage();
    return count;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Check if queue is full
   */
  isFull(): boolean {
    return this.queue.length >= this.maxSize;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    byCollection: Record<string, number>;
    byType: Record<string, number>;
    isFull: boolean;
  } {
    const byCollection: Record<string, number> = {};
    const byType: Record<'insert' | 'update' | 'delete', number> = {
      insert: 0,
      update: 0,
      delete: 0
    };

    for (const event of this.queue) {
      byCollection[event.collection] = (byCollection[event.collection] ?? 0) + 1;
      byType[event.type]++;
    }

    return {
      size: this.queue.length,
      maxSize: this.maxSize,
      byCollection,
      byType,
      isFull: this.isFull()
    };
  }

  /**
   * Deduplicate events (keep latest for same document)
   */
  deduplicate(): number {
    const seen = new Map<string, number>();
    const toRemove: number[] = [];

    // Find duplicates (keep the last occurrence by tracking first seen)
    for (let i = 0; i < this.queue.length; i++) {
      const event = this.queue[i];
      const key = `${event.collection}:${event.documentId}`;

      if (seen.has(key)) {
        // Mark earlier occurrence for removal
        toRemove.push(seen.get(key)!);
      }

      // Always update with latest index for this key
      seen.set(key, i);
    }

    // Remove duplicates (in reverse order to preserve indices)
    for (const index of toRemove.sort((a, b) => b - a)) {
      this.queue.splice(index, 1);
    }

    if (toRemove.length > 0) {
      this.saveToStorage();
    }

    return toRemove.length;
  }
}
