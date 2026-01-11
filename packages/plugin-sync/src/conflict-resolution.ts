import { Document, UpdateOperation } from '@nebula-db/core';

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
  /**
   * Resolved document/value
   */
  resolved: Document | null;

  /**
   * Whether conflict was resolved
   */
  conflicted: boolean;

  /**
   * Conflict details
   */
  details?: {
    /**
     * Local version
     */
    local: Document;

    /**
     * Remote version
     */
    remote: Document;

    /**
     * Resolution strategy used
     */
    strategy: string;

    /**
     * Timestamp of resolution
     */
    resolvedAt: number;
  };
}

/**
 * Document version with metadata
 */
export interface VersionedDocument extends Document {
  /**
   * Document version/timestamp
   */
  __version?: number;

  /**
   * Last write timestamp
   */
  __lastWrite?: number;

  /**
   * Client ID that made the last write
   */
  __clientId?: string;
}

/**
 * Conflict detection result
 */
export interface ConflictDetection {
  /**
   * Whether conflict exists
   */
  hasConflict: boolean;

  /**
   * Conflicting fields
   */
  conflictingFields?: string[];

  /**
   * Conflict details
   */
  details?: string;
}

/**
 * Last-Write-Wins conflict resolver
 */
export class LastWriteWinsResolver {
  /**
   * Detect conflict between two documents
   */
  detectConflict(local: VersionedDocument, remote: VersionedDocument): ConflictDetection {
    if (!local || !remote) {
      return { hasConflict: false };
    }

    const localTime = local.__lastWrite || 0;
    const remoteTime = remote.__lastWrite || 0;

    // No conflict if one clearly has newer timestamp
    if (Math.abs(localTime - remoteTime) > 1000) {
      // More than 1 second difference
      return { hasConflict: false };
    }

    // Check if actual data differs
    const conflictingFields = findDifferences(local, remote);

    if (conflictingFields.length === 0) {
      return { hasConflict: false };
    }

    return {
      hasConflict: true,
      conflictingFields,
      details: `Documents differ in fields: ${conflictingFields.join(', ')}`
    };
  }

  /**
   * Resolve conflict using last-write-wins
   */
  resolve(local: VersionedDocument, remote: VersionedDocument): ConflictResolutionResult {
    const conflict = this.detectConflict(local, remote);

    if (!conflict.hasConflict) {
      // Return merged document
      return {
        resolved: remote,
        conflicted: false
      };
    }

    const localTime = local.__lastWrite || 0;
    const remoteTime = remote.__lastWrite || 0;

    const winner = remoteTime >= localTime ? remote : local;
    const loser = remoteTime >= localTime ? local : remote;

    return {
      resolved: winner,
      conflicted: true,
      details: {
        local,
        remote,
        strategy: 'last-write-wins',
        resolvedAt: Date.now()
      }
    };
  }
}

/**
 * Server-Wins conflict resolver
 */
export class ServerWinsResolver {
  /**
   * Detect conflict
   */
  detectConflict(local: VersionedDocument, remote: VersionedDocument): ConflictDetection {
    const conflictingFields = findDifferences(local, remote);

    return {
      hasConflict: conflictingFields.length > 0,
      conflictingFields,
      details: conflictingFields.length > 0 
        ? `Documents differ in fields: ${conflictingFields.join(', ')}`
        : undefined
    };
  }

  /**
   * Resolve conflict - server always wins
   */
  resolve(local: VersionedDocument, remote: VersionedDocument): ConflictResolutionResult {
    const conflict = this.detectConflict(local, remote);

    if (!conflict.hasConflict) {
      return {
        resolved: remote,
        conflicted: false
      };
    }

    return {
      resolved: remote,
      conflicted: true,
      details: {
        local,
        remote,
        strategy: 'server-wins',
        resolvedAt: Date.now()
      }
    };
  }
}

/**
 * Client-Wins conflict resolver
 */
export class ClientWinsResolver {
  /**
   * Detect conflict
   */
  detectConflict(local: VersionedDocument, remote: VersionedDocument): ConflictDetection {
    const conflictingFields = findDifferences(local, remote);

    return {
      hasConflict: conflictingFields.length > 0,
      conflictingFields,
      details: conflictingFields.length > 0 
        ? `Documents differ in fields: ${conflictingFields.join(', ')}`
        : undefined
    };
  }

  /**
   * Resolve conflict - client always wins
   */
  resolve(local: VersionedDocument, remote: VersionedDocument): ConflictResolutionResult {
    const conflict = this.detectConflict(local, remote);

    if (!conflict.hasConflict) {
      return {
        resolved: remote,
        conflicted: false
      };
    }

    return {
      resolved: local,
      conflicted: true,
      details: {
        local,
        remote,
        strategy: 'client-wins',
        resolvedAt: Date.now()
      }
    };
  }
}

/**
 * Custom merge resolver
 */
export class CustomMergeResolver {
  /**
   * Constructor
   */
  constructor(
    private mergeFn: (local: VersionedDocument, remote: VersionedDocument) => VersionedDocument
  ) {}

  /**
   * Detect conflict
   */
  detectConflict(local: VersionedDocument, remote: VersionedDocument): ConflictDetection {
    const conflictingFields = findDifferences(local, remote);

    return {
      hasConflict: conflictingFields.length > 0,
      conflictingFields,
      details: conflictingFields.length > 0 
        ? `Documents differ in fields: ${conflictingFields.join(', ')}`
        : undefined
    };
  }

  /**
   * Resolve conflict using custom merge function
   */
  resolve(local: VersionedDocument, remote: VersionedDocument): ConflictResolutionResult {
    const conflict = this.detectConflict(local, remote);

    if (!conflict.hasConflict) {
      return {
        resolved: remote,
        conflicted: false
      };
    }

    try {
      const merged = this.mergeFn(local, remote);

      return {
        resolved: merged,
        conflicted: true,
        details: {
          local,
          remote,
          strategy: 'custom-merge',
          resolvedAt: Date.now()
        }
      };
    } catch (error) {
      // If merge fails, fall back to server-wins
      return {
        resolved: remote,
        conflicted: true,
        details: {
          local,
          remote,
          strategy: 'custom-merge-fallback',
          resolvedAt: Date.now()
        }
      };
    }
  }
}

/**
 * Find differences between two documents
 */
export function findDifferences(doc1: Document, doc2: Document): string[] {
  const fields = new Set<string>();
  const allKeys = new Set([...Object.keys(doc1), ...Object.keys(doc2)]);

  for (const key of allKeys) {
    // Skip internal fields
    if (key.startsWith('__')) continue;

    const v1 = doc1[key];
    const v2 = doc2[key];

    if (!deepEqual(v1, v2)) {
      fields.add(key);
    }
  }

  return Array.from(fields);
}

/**
 * Deep equality check
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  return a === b;
}

/**
 * Create a conflict resolver
 */
export function createConflictResolver(
  strategy: 'last-write-wins' | 'server-wins' | 'client-wins' | 'custom',
  mergeFn?: (local: VersionedDocument, remote: VersionedDocument) => VersionedDocument
) {
  switch (strategy) {
    case 'last-write-wins':
      return new LastWriteWinsResolver();
    case 'server-wins':
      return new ServerWinsResolver();
    case 'client-wins':
      return new ClientWinsResolver();
    case 'custom':
      if (!mergeFn) {
        throw new Error('Custom merge function required for custom strategy');
      }
      return new CustomMergeResolver(mergeFn);
    default:
      return new LastWriteWinsResolver();
  }
}
