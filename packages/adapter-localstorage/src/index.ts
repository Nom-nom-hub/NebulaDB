import type { Adapter, Document } from '@nebula-db/core';

declare const localStorage: Storage;

export class LocalStorageAdapter implements Adapter {
  private prefix: string;

  constructor(prefix = 'nebula-db:') {
    this.prefix = prefix;
  }

  async load(): Promise<Record<string, Document[]>> {
    const collections: Record<string, Document[]> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(this.prefix)) continue;

      const collectionName = key.slice(this.prefix.length).replace(':docs', '');
      if (!collectionName) continue;

      try {
        const content = localStorage.getItem(key);
        if (content) {
          collections[collectionName] = JSON.parse(content);
        }
      } catch {
        continue;
      }
    }

    return collections;
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    for (const [collectionName, docs] of Object.entries(data)) {
      const key = `${this.prefix}${collectionName}:docs`;
      localStorage.setItem(key, JSON.stringify(docs));
    }
  }

  clear(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }
}

export function createLocalStorageAdapter(prefix?: string): LocalStorageAdapter {
  return new LocalStorageAdapter(prefix);
}