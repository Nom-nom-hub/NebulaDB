import { Adapter, Document } from '@nebula/core';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * FileSystem adapter for NebulaDB
 * This adapter persists data to the file system (Node.js environments)
 */
export class FileSystemAdapter implements Adapter {
  private filePath: string;
  private ensureDir: boolean;

  /**
   * Create a new FileSystemAdapter
   * @param filePath The path to the file where data will be stored
   * @param ensureDir Whether to ensure the directory exists
   */
  constructor(filePath: string, ensureDir: boolean = true) {
    this.filePath = filePath;
    this.ensureDir = ensureDir;
  }

  /**
   * Ensure the directory exists
   */
  private async ensureDirectory(): Promise<void> {
    if (!this.ensureDir) return;
    
    const dir = path.dirname(this.filePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Load data from the file system
   */
  async load(): Promise<Record<string, Document[]>> {
    try {
      await this.ensureDirectory();
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist yet, return empty data
        return {};
      }
      console.error('Failed to load data from file system:', error);
      return {};
    }
  }

  /**
   * Save data to the file system
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      await this.ensureDirectory();
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save data to file system:', error);
      throw error;
    }
  }
}
