import { describe, it, expect } from 'vitest';
import {
  LastWriteWinsResolver,
  ServerWinsResolver,
  ClientWinsResolver,
  CustomMergeResolver,
  VersionedDocument,
  findDifferences,
  deepEqual,
  createConflictResolver
} from '../src/conflict-resolution';

describe('Conflict Resolution', () => {
  describe('findDifferences', () => {
    it('should detect no differences when documents are identical', () => {
      const doc1 = { id: '1', name: 'Alice', age: 30 };
      const doc2 = { id: '1', name: 'Alice', age: 30 };

      const diffs = findDifferences(doc1, doc2);
      expect(diffs).toEqual([]);
    });

    it('should detect differences in multiple fields', () => {
      const doc1 = { id: '1', name: 'Alice', age: 30 };
      const doc2 = { id: '1', name: 'Bob', age: 25 };

      const diffs = findDifferences(doc1, doc2);
      expect(diffs).toContain('name');
      expect(diffs).toContain('age');
      expect(diffs.length).toBe(2);
    });

    it('should ignore internal fields starting with __', () => {
      const doc1 = { id: '1', name: 'Alice', __version: 1 };
      const doc2 = { id: '1', name: 'Alice', __version: 2 };

      const diffs = findDifferences(doc1, doc2);
      expect(diffs).toEqual([]);
    });

    it('should detect field additions', () => {
      const doc1 = { id: '1', name: 'Alice' };
      const doc2 = { id: '1', name: 'Alice', email: 'alice@example.com' };

      const diffs = findDifferences(doc1, doc2);
      expect(diffs).toContain('email');
    });
  });

  describe('deepEqual', () => {
    it('should return true for identical primitives', () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual('test', 'test')).toBe(true);
      expect(deepEqual(true, true)).toBe(true);
    });

    it('should return false for different primitives', () => {
      expect(deepEqual(1, 2)).toBe(false);
      expect(deepEqual('test', 'other')).toBe(false);
      expect(deepEqual(true, false)).toBe(false);
    });

    it('should return true for identical objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 2 };
      expect(deepEqual(obj1, obj2)).toBe(true);
    });

    it('should return true for identical nested objects', () => {
      const obj1 = { a: { b: { c: 1 } } };
      const obj2 = { a: { b: { c: 1 } } };
      expect(deepEqual(obj1, obj2)).toBe(true);
    });

    it('should return false for different nested objects', () => {
      const obj1 = { a: { b: { c: 1 } } };
      const obj2 = { a: { b: { c: 2 } } };
      expect(deepEqual(obj1, obj2)).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(undefined, undefined)).toBe(true);
      expect(deepEqual(null, undefined)).toBe(false);
    });
  });

  describe('LastWriteWinsResolver', () => {
    const resolver = new LastWriteWinsResolver();

    it('should detect no conflict when timestamps differ by > 1 second', () => {
      const local: VersionedDocument = {
        id: '1',
        name: 'Alice',
        __lastWrite: 1000
      };
      const remote: VersionedDocument = {
        id: '1',
        name: 'Bob',
        __lastWrite: 3000
      };

      const conflict = resolver.detectConflict(local, remote);
      expect(conflict.hasConflict).toBe(false);
    });

    it('should detect conflict when timestamps are close and data differs', () => {
      const local: VersionedDocument = {
        id: '1',
        name: 'Alice',
        __lastWrite: 1000
      };
      const remote: VersionedDocument = {
        id: '1',
        name: 'Bob',
        __lastWrite: 1500
      };

      const conflict = resolver.detectConflict(local, remote);
      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflictingFields).toContain('name');
    });

    it('should resolve conflict with remote (newer) winning', () => {
      const local: VersionedDocument = {
        id: '1',
        name: 'Alice',
        __lastWrite: 1000
      };
      const remote: VersionedDocument = {
        id: '1',
        name: 'Bob',
        __lastWrite: 2000
      };

      const result = resolver.resolve(local, remote);
      expect(result.resolved).toEqual(remote);
      expect(result.conflicted).toBe(true);
      expect(result.details?.strategy).toBe('last-write-wins');
    });

    it('should resolve conflict with local (newer) winning', () => {
      const local: VersionedDocument = {
        id: '1',
        name: 'Alice',
        __lastWrite: 3000
      };
      const remote: VersionedDocument = {
        id: '1',
        name: 'Bob',
        __lastWrite: 2000
      };

      const result = resolver.resolve(local, remote);
      expect(result.resolved).toEqual(local);
      expect(result.conflicted).toBe(true);
    });
  });

  describe('ServerWinsResolver', () => {
    const resolver = new ServerWinsResolver();

    it('should always choose remote (server) version on conflict', () => {
      const local: VersionedDocument = {
        id: '1',
        name: 'Alice',
        __lastWrite: 5000
      };
      const remote: VersionedDocument = {
        id: '1',
        name: 'Bob',
        __lastWrite: 1000
      };

      const result = resolver.resolve(local, remote);
      expect(result.resolved).toEqual(remote);
      expect(result.details?.strategy).toBe('server-wins');
    });

    it('should detect conflicts correctly', () => {
      const local: VersionedDocument = { id: '1', name: 'Alice' };
      const remote: VersionedDocument = { id: '1', name: 'Bob' };

      const conflict = resolver.detectConflict(local, remote);
      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflictingFields).toContain('name');
    });
  });

  describe('ClientWinsResolver', () => {
    const resolver = new ClientWinsResolver();

    it('should always choose local (client) version on conflict', () => {
      const local: VersionedDocument = {
        id: '1',
        name: 'Alice',
        __lastWrite: 1000
      };
      const remote: VersionedDocument = {
        id: '1',
        name: 'Bob',
        __lastWrite: 5000
      };

      const result = resolver.resolve(local, remote);
      expect(result.resolved).toEqual(local);
      expect(result.details?.strategy).toBe('client-wins');
    });
  });

  describe('CustomMergeResolver', () => {
    it('should use custom merge function', () => {
      const mergeFn = (local: VersionedDocument, remote: VersionedDocument) => ({
        ...remote,
        name: `${local.name} & ${remote.name}`
      });

      const resolver = new CustomMergeResolver(mergeFn);
      const local: VersionedDocument = { id: '1', name: 'Alice' };
      const remote: VersionedDocument = { id: '1', name: 'Bob' };

      const result = resolver.resolve(local, remote);
      expect(result.resolved?.name).toBe('Alice & Bob');
      expect(result.details?.strategy).toBe('custom-merge');
    });

    it('should fall back to server-wins if merge function throws', () => {
      const mergeFn = () => {
        throw new Error('Merge failed');
      };

      const resolver = new CustomMergeResolver(mergeFn as any);
      const local: VersionedDocument = { id: '1', name: 'Alice' };
      const remote: VersionedDocument = { id: '1', name: 'Bob' };

      const result = resolver.resolve(local, remote);
      expect(result.resolved).toEqual(remote);
      expect(result.details?.strategy).toBe('custom-merge-fallback');
    });
  });

  describe('createConflictResolver', () => {
    it('should create last-write-wins resolver', () => {
      const resolver = createConflictResolver('last-write-wins');
      expect(resolver).toBeInstanceOf(LastWriteWinsResolver);
    });

    it('should create server-wins resolver', () => {
      const resolver = createConflictResolver('server-wins');
      expect(resolver).toBeInstanceOf(ServerWinsResolver);
    });

    it('should create client-wins resolver', () => {
      const resolver = createConflictResolver('client-wins');
      expect(resolver).toBeInstanceOf(ClientWinsResolver);
    });

    it('should create custom resolver', () => {
      const mergeFn = (l: VersionedDocument, r: VersionedDocument) => r;
      const resolver = createConflictResolver('custom', mergeFn);
      expect(resolver).toBeInstanceOf(CustomMergeResolver);
    });

    it('should throw error if custom strategy without merge function', () => {
      expect(() => {
        createConflictResolver('custom');
      }).toThrow('Custom merge function required for custom strategy');
    });
  });
});
