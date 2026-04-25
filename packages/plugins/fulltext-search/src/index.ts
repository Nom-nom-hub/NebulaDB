import { Plugin, Document } from '@nebula-db/core';

export interface FullTextOptions {
  fields: string[];
  stopWords?: Set<string>;
  minWordLength?: number;
  tokenizer?: 'whitespace' | 'alphanumeric';
}

interface InvertedIndexEntry {
  term: string;
  documentIds: Set<string>;
  positions: Map<string, number[]>;
}

export class FullTextSearchPlugin implements Plugin {
  name = 'fulltext-search';

  private invertedIndex: Map<string, InvertedIndexEntry> = new Map();
  private options: Required<FullTextOptions>;
  private collectionName: string = '';
  private documentFieldCache: Map<string, Map<string, string>> = new Map();

  constructor(options: FullTextOptions) {
    this.options = {
      fields: options.fields,
      stopWords: options.stopWords || new Set(DEFAULT_STOP_WORDS),
      minWordLength: options.minWordLength || 2,
      tokenizer: options.tokenizer || 'whitespace'
    };
  }

  private tokenize(text: string): string[] {
    let tokens: string[];

    if (this.options.tokenizer === 'alphanumeric') {
      tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    } else {
      tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
    }

    return tokens.filter(
      token =>
        token.length >= this.options.minWordLength &&
        !this.options.stopWords.has(token)
    );
  }

  async onInit(collection: any): Promise<void> {
    this.collectionName = collection.name;
  }

  async onAfterInsert(collection: string, doc: Document): Promise<void> {
    if (collection !== this.collectionName) return;

    for (const field of this.options.fields) {
      const value = this.getNestedValue(doc, field);
      if (typeof value !== 'string') continue;

      const tokens = this.tokenize(value);
      const positions: Map<string, number[]> = new Map();

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, {
            term: token,
            documentIds: new Set(),
            positions: new Map()
          });
        }

        const entry = this.invertedIndex.get(token)!;
        entry.documentIds.add(doc.id as string);

        if (!positions.has(doc.id as string)) {
          positions.set(doc.id as string, []);
        }
        positions.get(doc.id as string)!.push(i);
      }

      const entry = this.invertedIndex.get(tokens[0]);
      if (entry) {
        entry.positions.set(doc.id as string, positions.get(doc.id as string) || []);
      }
    }
  }

  async onAfterUpdate(
    collection: string,
    query: any,
    update: any,
    affectedDocs: Document[]
  ): Promise<void> {
    if (collection !== this.collectionName) return;

    for (const doc of affectedDocs) {
      await this.onAfterDelete(collection, { id: doc.id }, [doc]);
    }
    for (const doc of affectedDocs) {
      await this.onAfterInsert(collection, doc);
    }
  }

  async onAfterDelete(
    collection: string,
    query: any,
    deletedDocs: Document[]
  ): Promise<void> {
    if (collection !== this.collectionName) return;

    for (const doc of deletedDocs) {
      for (const [term, entry] of this.invertedIndex) {
        entry.documentIds.delete(doc.id as string);
      }
    }
  }

  async onAfterQuery(
    collection: string,
    query: any,
    results: Document[]
  ): Promise<Document[]> {
    if (!query.$text) return results;

    const searchText = query.$text.$search;
    if (!searchText) return results;

    const searchTokens = this.tokenize(searchText);
    if (searchTokens.length === 0) return results;

    const docScores: Map<string, number> = new Map();

    for (const token of searchTokens) {
      const entry = this.invertedIndex.get(token);
      if (!entry) continue;

      for (const docId of entry.documentIds) {
        const currentScore = docScores.get(docId) || 0;
        docScores.set(docId, currentScore + 1);
      }
    }

    const threshold = query.$text.$threshold || 1;
    return results.filter(doc => (docScores.get(doc.id as string) || 0) >= threshold);
  }

  search(
    searchText: string,
    options?: {
      limit?: number;
      offset?: number;
      $threshold?: number;
    }
  ): string[] {
    const searchTokens = this.tokenize(searchText);
    if (searchTokens.length === 0) return [];

    const docScores: Map<string, number> = new Map();

    for (const token of searchTokens) {
      const entry = this.invertedIndex.get(token);
      if (!entry) continue;

      for (const docId of entry.documentIds) {
        const currentScore = docScores.get(docId) || 0;
        docScores.set(docId, currentScore + 1);
      }
    }

    const sorted = Array.from(docScores.entries())
      .sort((a, b) => b[1] - a[1]);

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    return sorted
      .filter(([_, score]) => score >= (options?.$threshold || 1))
      .slice(offset, offset + limit)
      .map(([docId]) => docId);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
  }

  getIndex(): Map<string, InvertedIndexEntry> {
    return this.invertedIndex;
  }

  clearIndex(): void {
    this.invertedIndex.clear();
  }
}

const DEFAULT_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that',
  'the', 'to', 'was', 'will', 'with'
]);

export function createFullTextSearchPlugin(options: FullTextOptions): FullTextSearchPlugin {
  return new FullTextSearchPlugin(options);
}