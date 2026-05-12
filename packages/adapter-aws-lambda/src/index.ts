import type { Adapter, Document } from '@nebula-db/core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

/**
 * AWS Lambda/DynamoDB Adapter for NebulaDB
 * Uses DynamoDB for persistent storage in AWS Lambda and serverless environments
 * 
 * @example
 * ```typescript
 * import { AwsLambdaAdapter } from '@nebula-db/adapter-aws-lambda';
 * import { createDb } from '@nebula-db/core';
 * 
 * // In AWS Lambda function
 * const db = createDb({
 *   adapter: new AwsLambdaAdapter({
 *     region: 'us-east-1',
 *     tableName: 'nebula-data'
 *   })
 * });
 * 
 * const users = db.collection('users');
 * await users.insert({ name: 'Alice' });
 * ```
 */
export interface AwsLambdaAdapterOptions {
  region: string;
  tableName: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export class AwsLambdaAdapter implements Adapter {
  private client: DynamoDBDocumentClient;
  private tableName: string;
  private data: Record<string, Document[]> = {};

  /**
   * Creates a new AWS Lambda/DynamoDB adapter
   * @param options - AWS configuration and table name
   */
  constructor(options: AwsLambdaAdapterOptions) {
    if (!options.region || !options.tableName) {
      throw new Error('AWS region and table name are required');
    }

    const config: any = {
      region: options.region
    };

    if (options.endpoint) {
      config.endpoint = options.endpoint;
    }

    if (options.accessKeyId && options.secretAccessKey) {
      config.credentials = {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey
      };
    }

    const ddbClient = new DynamoDBClient(config);
    this.client = DynamoDBDocumentClient.from(ddbClient);
    this.tableName = options.tableName;
  }

  /**
   * Load all collections and documents from DynamoDB
   */
  async load(): Promise<Record<string, Document[]>> {
    try {
      const result = await this.client.send(
        new ScanCommand({
          TableName: this.tableName
        })
      );

      const collections: Record<string, Document[]> = {};
      const items = result.Items || [];

      for (const item of items) {
        const collectionName = item.collectionName as string;
        const documents = item.documents as Document[] || [];

        if (!collections[collectionName]) {
          collections[collectionName] = [];
        }
        collections[collectionName].push(...documents);
      }

      this.data = collections;
      return collections;
    } catch (error) {
      throw new Error(`Failed to load from DynamoDB: ${error}`);
    }
  }

  /**
   * Save all collections and documents to DynamoDB
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      // Delete all existing items first
      const existing = await this.client.send(
        new ScanCommand({ TableName: this.tableName })
      );

      if (existing.Items && existing.Items.length > 0) {
        for (const item of existing.Items) {
          await this.client.send(
            new DeleteCommand({
              TableName: this.tableName,
              Key: { id: item.id }
            })
          );
        }
      }

      // Insert all collections
      for (const [collectionName, docs] of Object.entries(data)) {
        await this.client.send(
          new PutCommand({
            TableName: this.tableName,
            Item: {
              id: collectionName,
              collectionName,
              documents: docs,
              timestamp: Date.now()
            }
          })
        );
      }
    } catch (error) {
      throw new Error(`Failed to save to DynamoDB: ${error}`);
    }
  }

  /**
   * Get the adapter's current data (for debugging)
   */
  getData(): Record<string, Document[]> {
    return this.data;
  }

  /**
   * Close connection (no-op for Lambda/DynamoDB)
   */
  async close(): Promise<void> {
    // No cleanup needed for DynamoDB
  }
}

/**
 * Create an AWS Lambda adapter instance
 */
export function createAwsLambdaAdapter(options: AwsLambdaAdapterOptions): AwsLambdaAdapter {
  return new AwsLambdaAdapter(options);
}