import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FilesystemAdapter, createFilesystemAdapter } from '../src/index';

describe('FilesystemAdapter', () => {
  let testDir: string;
  let adapter: FilesystemAdapter;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nebula-fs-'));
    adapter = createFilesystemAdapter(testDir);
  });

  describe('load', () => {
    it('should return empty when directory does not exist', async () => {
      const adapter2 = createFilesystemAdapter('/nonexistent/path');
      const data = await adapter2.load();
      expect(data).toEqual({});
    });

    it('should load saved JSON files', async () => {
      await adapter.save({
        users: [{ id: '1', name: 'Alice' }],
        posts: [{ id: '2', title: 'Hello' }]
      });

      const data = await adapter.load();
      expect(data.users).toHaveLength(1);
      expect(data.users[0].name).toBe('Alice');
    });

    it('should ignore non-json files', async () => {
      fs.writeFileSync(path.join(testDir, 'readme.txt'), 'text file');
      await adapter.save({ data: [{ id: '1' }] });

      const data = await adapter.load();
      expect(data.data).toHaveLength(1);
    });
  });

  describe('save', () => {
    it('should create directory if not exists', async () => {
      const newDir = path.join(testDir, 'nested', 'dir');
      const newAdapter = createFilesystemAdapter(newDir);
      await newAdapter.save({ test: [{ id: '1' }] });

      expect(fs.existsSync(newDir)).toBe(true);
    });

    it('should save JSON files per collection', async () => {
      await adapter.save({
        users: [{ id: '1', name: 'Bob' }],
        posts: [{ id: '2', title: 'Test' }]
      });

      expect(fs.existsSync(path.join(testDir, 'users.json'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'posts.json'))).toBe(true);
    });

    it('should overwrite existing files', async () => {
      await adapter.save({ users: [{ id: '1', name: 'Alice' }] });
      await adapter.save({ users: [{ id: '2', name: 'Bob' }] });

      const content = fs.readFileSync(path.join(testDir, 'users.json'), 'utf-8');
      const data = JSON.parse(content);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('Bob');
    });
  });

  describe('getDirPath', () => {
    it('should return the directory path', () => {
      expect(adapter.getDirPath()).toBe(testDir);
    });
  });
});