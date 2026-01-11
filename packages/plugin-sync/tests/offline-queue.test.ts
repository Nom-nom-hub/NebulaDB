import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineQueue } from '../src/offline-queue';
import { SyncEvent } from '../src/index';

describe('OfflineQueue', () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    queue = new OfflineQueue({ maxSize: 10 });
  });

  describe('add', () => {
    it('should add an event to the queue', () => {
      const event: SyncEvent = {
        id: '1',
        type: 'insert',
        collection: 'users',
        documentId: 'user1',
        data: { id: 'user1', name: 'Alice' },
        timestamp: Date.now(),
        clientId: 'client1'
      };

      const result = queue.add(event);
      expect(result).toBe(true);
      expect(queue.size()).toBe(1);
    });

    it('should maintain insertion order', () => {
      const events: SyncEvent[] = [];
      for (let i = 0; i < 5; i++) {
        const event: SyncEvent = {
          id: String(i),
          type: 'insert',
          collection: 'users',
          documentId: `user${i}`,
          data: { id: `user${i}`, name: `User ${i}` },
          timestamp: Date.now(),
          clientId: 'client1'
        };
        events.push(event);
        queue.add(event);
      }

      const all = queue.getAll();
      for (let i = 0; i < 5; i++) {
        expect(all[i].id).toBe(String(i));
      }
    });

    it('should remove oldest event when queue is full', () => {
      const queueSmall = new OfflineQueue({ maxSize: 3 });

      for (let i = 0; i < 5; i++) {
        const event: SyncEvent = {
          id: String(i),
          type: 'insert',
          collection: 'users',
          documentId: `user${i}`,
          data: {},
          timestamp: Date.now(),
          clientId: 'client1'
        };
        queueSmall.add(event);
      }

      expect(queueSmall.size()).toBe(3);
      const all = queueSmall.getAll();
      expect(all[0].id).toBe('2');
      expect(all[1].id).toBe('3');
      expect(all[2].id).toBe('4');
    });
  });

  describe('getAll', () => {
    it('should return all events', () => {
      const event1: SyncEvent = {
        id: '1',
        type: 'insert',
        collection: 'users',
        documentId: 'user1',
        data: {},
        timestamp: Date.now(),
        clientId: 'client1'
      };
      const event2: SyncEvent = {
        id: '2',
        type: 'update',
        collection: 'users',
        documentId: 'user1',
        update: { $set: { name: 'Alice' } },
        timestamp: Date.now(),
        clientId: 'client1'
      };

      queue.add(event1);
      queue.add(event2);

      const all = queue.getAll();
      expect(all).toHaveLength(2);
      expect(all[0].id).toBe('1');
      expect(all[1].id).toBe('2');
    });

    it('should return a copy of the queue', () => {
      const event: SyncEvent = {
        id: '1',
        type: 'insert',
        collection: 'users',
        documentId: 'user1',
        data: {},
        timestamp: Date.now(),
        clientId: 'client1'
      };
      queue.add(event);

      const all1 = queue.getAll();
      const all2 = queue.getAll();

      expect(all1).toEqual(all2);
      expect(all1).not.toBe(all2);
    });
  });

  describe('getByCollection', () => {
    it('should return events for specific collection', () => {
      const event1: SyncEvent = {
        id: '1',
        type: 'insert',
        collection: 'users',
        documentId: 'user1',
        data: {},
        timestamp: Date.now(),
        clientId: 'client1'
      };
      const event2: SyncEvent = {
        id: '2',
        type: 'insert',
        collection: 'posts',
        documentId: 'post1',
        data: {},
        timestamp: Date.now(),
        clientId: 'client1'
      };

      queue.add(event1);
      queue.add(event2);

      const userEvents = queue.getByCollection('users');
      expect(userEvents).toHaveLength(1);
      expect(userEvents[0].collection).toBe('users');
    });
  });

  describe('getByType', () => {
    it('should return events by type', () => {
      const insertEvent: SyncEvent = {
        id: '1',
        type: 'insert',
        collection: 'users',
        documentId: 'user1',
        data: {},
        timestamp: Date.now(),
        clientId: 'client1'
      };
      const updateEvent: SyncEvent = {
        id: '2',
        type: 'update',
        collection: 'users',
        documentId: 'user1',
        update: {},
        timestamp: Date.now(),
        clientId: 'client1'
      };
      const deleteEvent: SyncEvent = {
        id: '3',
        type: 'delete',
        collection: 'users',
        documentId: 'user2',
        timestamp: Date.now(),
        clientId: 'client1'
      };

      queue.add(insertEvent);
      queue.add(updateEvent);
      queue.add(deleteEvent);

      expect(queue.getByType('insert')).toHaveLength(1);
      expect(queue.getByType('update')).toHaveLength(1);
      expect(queue.getByType('delete')).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('should remove event by id', () => {
      const event: SyncEvent = {
        id: '1',
        type: 'insert',
        collection: 'users',
        documentId: 'user1',
        data: {},
        timestamp: Date.now(),
        clientId: 'client1'
      };
      queue.add(event);

      expect(queue.size()).toBe(1);
      const removed = queue.remove('1');
      expect(removed).toBe(true);
      expect(queue.size()).toBe(0);
    });

    it('should return false if event not found', () => {
      const removed = queue.remove('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all events', () => {
      for (let i = 0; i < 5; i++) {
        const event: SyncEvent = {
          id: String(i),
          type: 'insert',
          collection: 'users',
          documentId: `user${i}`,
          data: {},
          timestamp: Date.now(),
          clientId: 'client1'
        };
        queue.add(event);
      }

      expect(queue.size()).toBe(5);
      const cleared = queue.clear();
      expect(cleared).toBe(5);
      expect(queue.size()).toBe(0);
    });
  });

  describe('isEmpty/isFull', () => {
    it('should report empty queue', () => {
      expect(queue.isEmpty()).toBe(true);
      expect(queue.isFull()).toBe(false);
    });

    it('should report full queue', () => {
      const smallQueue = new OfflineQueue({ maxSize: 2 });
      for (let i = 0; i < 2; i++) {
        smallQueue.add({
          id: String(i),
          type: 'insert',
          collection: 'users',
          documentId: `user${i}`,
          data: {},
          timestamp: Date.now(),
          clientId: 'client1'
        });
      }

      expect(smallQueue.isFull()).toBe(true);
      expect(smallQueue.isEmpty()).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', () => {
      const event1: SyncEvent = {
        id: '1',
        type: 'insert',
        collection: 'users',
        documentId: 'user1',
        data: {},
        timestamp: Date.now(),
        clientId: 'client1'
      };
      const event2: SyncEvent = {
        id: '2',
        type: 'insert',
        collection: 'posts',
        documentId: 'post1',
        data: {},
        timestamp: Date.now(),
        clientId: 'client1'
      };

      queue.add(event1);
      queue.add(event2);

      const stats = queue.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(10);
      expect(stats.byCollection.users).toBe(1);
      expect(stats.byCollection.posts).toBe(1);
      expect(stats.byType.insert).toBe(2);
      expect(stats.isFull).toBe(false);
    });
  });

  describe('deduplicate', () => {
    it('should remove duplicate events for same document', () => {
      const event1: SyncEvent = {
        id: '1',
        type: 'insert',
        collection: 'users',
        documentId: 'user1',
        data: { name: 'Alice' },
        timestamp: Date.now(),
        clientId: 'client1'
      };
      const event2: SyncEvent = {
        id: '2',
        type: 'update',
        collection: 'users',
        documentId: 'user1',
        update: { $set: { name: 'Bob' } },
        timestamp: Date.now(),
        clientId: 'client1'
      };

      queue.add(event1);
      queue.add(event2);

      expect(queue.size()).toBe(2);
      const removed = queue.deduplicate();
      expect(removed).toBe(1);
      expect(queue.size()).toBe(1);

      // Should keep the last event (event2)
      const remaining = queue.getAll();
      expect(remaining[0].id).toBe('2');
      expect(remaining[0].type).toBe('update');
    });

    it('should not remove events for different documents', () => {
      const event1: SyncEvent = {
        id: '1',
        type: 'insert',
        collection: 'users',
        documentId: 'user1',
        data: {},
        timestamp: Date.now(),
        clientId: 'client1'
      };
      const event2: SyncEvent = {
        id: '2',
        type: 'insert',
        collection: 'users',
        documentId: 'user2',
        data: {},
        timestamp: Date.now(),
        clientId: 'client1'
      };

      queue.add(event1);
      queue.add(event2);

      const removed = queue.deduplicate();
      expect(removed).toBe(0);
      expect(queue.size()).toBe(2);
    });
  });

  describe('addAll', () => {
    it('should add multiple events', () => {
      const events: SyncEvent[] = [
        {
          id: '1',
          type: 'insert',
          collection: 'users',
          documentId: 'user1',
          data: {},
          timestamp: Date.now(),
          clientId: 'client1'
        },
        {
          id: '2',
          type: 'update',
          collection: 'users',
          documentId: 'user1',
          update: {},
          timestamp: Date.now(),
          clientId: 'client1'
        }
      ];

      const added = queue.addAll(events);
      expect(added).toBe(2);
      expect(queue.size()).toBe(2);
    });
  });

  describe('removeAll', () => {
    it('should remove multiple events', () => {
      for (let i = 0; i < 3; i++) {
        queue.add({
          id: String(i),
          type: 'insert',
          collection: 'users',
          documentId: `user${i}`,
          data: {},
          timestamp: Date.now(),
          clientId: 'client1'
        });
      }

      const removed = queue.removeAll(['0', '2']);
      expect(removed).toBe(2);
      expect(queue.size()).toBe(1);

      const remaining = queue.getAll();
      expect(remaining[0].id).toBe('1');
    });
  });
});
