import type { Adapter, Document } from '@nebula-db/core';

export class MemoryAdapter implements Adapter {
  private data: Record<string, Document[]> = {};
  private autoClear = true;

  constructor(autoClear = true) {
    this.autoClear = autoClear;
  }

  async load(): Promise<Record<string, Document[]>> {
    return this.data;
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    this.data = data;
  }

  getData(): Record<string, Document[]> {
    return this.data;
  }

  clear(): void {
    this.data = {};
  }

  setData(data: Record<string, Document[]>): void {
    this.data = data;
  }
}

export function createMemoryAdapter(autoClear = true): MemoryAdapter {
  return new MemoryAdapter(autoClear);
}