import { describe, it, expect, beforeEach } from 'vitest';
import { FullTextSearchPlugin, createFullTextSearchPlugin } from '../src/index';
import { Document } from '@nebula-db/core';

describe('FullTextSearchPlugin', () => {
  let plugin: FullTextSearchPlugin;

  beforeEach(() => {
    plugin = createFullTextSearchPlugin({
      fields: ['title', 'content']
    });
  });

  describe('tokenize', () => {
    it('should tokenize text', async () => {
      plugin.onAfterInsert('test', { id: '1', title: 'Hello World', content: 'Test content' } as Document);
      
      const results = plugin.search('hello');
      expect(results).toContain('1');
    });

    it('should filter stop words', async () => {
      plugin.onAfterInsert('test', { id: '1', title: 'The and are test', content: '' } as Document);
      
      const results = plugin.search('the');
      expect(results).toHaveLength(0);
    });

    it('should filter short words', async () => {
      plugin.onAfterInsert('test', { id: '1', title: 'a test', content: '' } as Document);
      
      const results = plugin.search('a');
      expect(results).toHaveLength(0);
    });
  });

  describe('search', () => {
    it('should find documents with search term', async () => {
      plugin.onAfterInsert('test', { id: '1', title: 'JavaScript programming', content: '' } as Document);
      plugin.onAfterInsert('test', { id: '2', title: 'Python tutorials', content: '' } as Document);
      
      const results = plugin.search('javascript');
      expect(results).toContain('1');
      expect(results).not.toContain('2');
    });

    it('should handle multiple terms', async () => {
      plugin.onAfterInsert('test', { id: '1', title: 'JavaScript guide', content: '' } as Document);
      plugin.onAfterInsert('test', { id: '2', title: 'Python guide', content: '' } as Document);
      
      const results = plugin.search('javascript python');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('clearIndex', () => {
    it('should clear the index', async () => {
      plugin.onAfterInsert('test', { id: '1', title: 'Test', content: '' } as Document);
      plugin.clearIndex();
      
      const results = plugin.search('test');
      expect(results).toHaveLength(0);
    });
  });
});