import * as fs from 'fs';
import * as path from 'path';
import type { Adapter, Document } from '@nebula-db/core';

export class FilesystemAdapter implements Adapter {
  private dirPath: string;
  private encoding: BufferEncoding;

  constructor(dirPath: string, encoding: BufferEncoding = 'utf-8') {
    this.dirPath = dirPath;
    this.encoding = encoding;
  }

  async load(): Promise<Record<string, Document[]>> {
    const collections: Record<string, Document[]> = {};

    if (!fs.existsSync(this.dirPath)) {
      return collections;
    }

    const entries = fs.readdirSync(this.dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const collectionName = entry.name.replace('.json', '');
        try {
          const filePath = path.join(this.dirPath, entry.name);
          const content = fs.readFileSync(filePath, this.encoding);
          const docs = JSON.parse(content) as Document[];
          collections[collectionName] = docs;
        } catch {
          continue;
        }
      }
    }

    return collections;
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    if (!fs.existsSync(this.dirPath)) {
      fs.mkdirSync(this.dirPath, { recursive: true });
    }

    for (const [collectionName, docs] of Object.entries(data)) {
      const filePath = path.join(this.dirPath, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), this.encoding);
    }
  }

  getDirPath(): string {
    return this.dirPath;
  }
}

export function createFilesystemAdapter(
  dirPath: string,
  encoding?: BufferEncoding
): FilesystemAdapter {
  return new FilesystemAdapter(dirPath, encoding);
}