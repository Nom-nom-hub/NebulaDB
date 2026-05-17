import type { Adapter, Document } from '@nebula-db/core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

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
   * Uses pagination to ensure all items are loaded
   */
  async load(): Promise<Record<string, Document[]>> {
    try {
      const collections: Record<string, Document[]> = {};
      let lastKey: Record<string, any> | undefined;

      do {
        const result = await this.client.send(
          new ScanCommand({
            TableName: this.tableName,
            ExclusiveStartKey: lastKey
          })
        );

        const items = result.Items || [];
        
        for (const item of items) {
          const collectionName = item.collectionName as string;
          const documents = item.documents as Document[] || [];

          if (!collections[collectionName]) {
            collections[collectionName] = [];
          }
          collections[collectionName].push(...documents);
        }

        lastKey = result.LastEvaluatedKey;
      } while (lastKey);

      this.data = collections;
      return collections;
    } catch (error) {
      throw new Error(`Failed to load from DynamoDB: ${error}`);
    }
  }

  /**
   * Save all collections and documents to DynamoDB
   * Uses batch writes for better performance
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      // Delete all existing items first (batched for performance)
      let lastKey: Record<string, any> | undefined;
      
      do {
        const existing = await this.client.send(
          new ScanCommand({ TableName: this.tableName, ExclusiveStartKey: lastKey })
        );

        if (existing.Items && existing.Items.length > 0) {
          const BATCH_SIZE = 25;
          
          for (let i = 0; i < existing.Items.length; i += BATCH_SIZE) {
            const batchItems = existing.Items.slice(i, i + BATCH_SIZE);
            
            const writeRequests = batchItems.map((item) => ({
              DeleteRequest: {
                Key: { id: item.id }
              }
            }));

            await this.client.send(
              new BatchWriteCommand({
                RequestItems: {
                  [this.tableName]: writeRequests
                }
              })
            );
          }
        }

        lastKey = existing.LastEvaluatedKey;
      } while (lastKey);

      // Insert all collections (batched for performance)
      const BATCH_SIZE = 25;
      const putRequests: { PutRequest: { Item: any } }[] = [];

      for (const [collectionName, docs] of Object.entries(data)) {
        putRequests.push({
          PutRequest: {
            Item: {
              id: collectionName,
              collectionName,
              documents: docs,
              timestamp: Date.now()
            }
          }
        });

        if (putRequests.length >= BATCH_SIZE) {
          await this.client.send(
            new BatchWriteCommand({
              RequestItems: { [this.tableName]: putRequests }
            })
          );
          putRequests.length = 0;
        }
      }

      // Insert remaining
      if (putRequests.length > 0) {
        await this.client.send(
          new BatchWriteCommand({
            RequestItems: { [this.tableName]: putRequests }
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