import { describe, it, expect } from 'vitest';
import { EnhancedIndexManager, IndexType } from '../src/enhanced-indexing';

describe('Partial indexes', () => {
  it('should only index documents that match the filter', () => {
    const indexManager = new EnhancedIndexManager();
    
    // Create a partial index for active users only
    indexManager.createIndex({
      name: 'active_users_idx',
      fields: ['lastActive'],
      type: IndexType.SINGLE,
      options: {
        partial: {
          filter: { active: true }
        }
      }
    });
    
    // Add documents to the index
    const activeUser1 = { id: '1', name: 'Alice', active: true, lastActive: new Date('2023-01-01') };
    const activeUser2 = { id: '2', name: 'Bob', active: true, lastActive: new Date('2023-01-02') };
    const inactiveUser = { id: '3', name: 'Charlie', active: false, lastActive: new Date('2022-12-01') };
    
    indexManager.addDocument(activeUser1);
    indexManager.addDocument(activeUser2);
    indexManager.addDocument(inactiveUser);
    
    // Query using the index
    const index = indexManager.getIndex('active_users_idx');
    expect(index).not.toBeUndefined();
    
    // TypeScript non-null assertion to handle the possibly undefined index
    const result = index!.find({ lastActive: { $gt: new Date('2022-12-31') } });
    expect(result).not.toBeNull();
    
    // Should only include active users
    expect(result!.size).toBe(2);
    expect(result!.has('1')).toBe(true);
    expect(result!.has('2')).toBe(true);
    expect(result!.has('3')).toBe(false);
  });
});
