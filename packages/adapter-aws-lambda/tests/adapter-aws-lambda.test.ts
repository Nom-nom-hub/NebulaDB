import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AWS SDK - everything inline to avoid hoisting issues
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn()
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: vi.fn().mockResolvedValue({ Items: [], LastEvaluatedKey: undefined })
    }))
  },
  ScanCommand: vi.fn((params) => params),
  PutCommand: vi.fn((params) => params),
  DeleteCommand: vi.fn((params) => params),
  BatchWriteCommand: vi.fn((params) => params)
}));

import { AwsLambdaAdapter, createAwsLambdaAdapter } from '../src/index';

describe('AwsLambdaAdapter', () => {
  let adapter: AwsLambdaAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = createAwsLambdaAdapter({
      region: 'us-east-1',
      tableName: 'nebula-data',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret'
    });
  });

  describe('constructor', () => {
    it('should create adapter with valid config', () => {
      expect(adapter).toBeInstanceOf(AwsLambdaAdapter);
    });

    it('should throw on missing required options', () => {
      expect(() => new AwsLambdaAdapter({ region: '', tableName: '' }))
        .toThrow('AWS region and table name are required');
    });
  });

  describe('save', () => {
    it('should save data without error', async () => {
      await adapter.save({ users: [{ id: '1', name: 'Alice' }] });
    });

    it('should handle empty collections', async () => {
      await adapter.save({});
    });

    it('should handle multiple collections', async () => {
      await adapter.save({
        users: [{ id: '1', name: 'Alice' }],
        posts: [{ id: '2', title: 'Hello' }]
      });
    });
  });

  describe('load', () => {
    it('should return empty object when no data', async () => {
      const data = await adapter.load();
      expect(data).toEqual({});
    });
  });

  describe('getData', () => {
    it('should return current data snapshot', () => {
      const data = adapter.getData();
      expect(data).toBeDefined();
    });
  });

  describe('close', () => {
    it('should close without error', async () => {
      await adapter.close();
    });
  });
});
