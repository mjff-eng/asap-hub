import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { isLocal, localDynamodbEndpoint } from '../config';

let documentClient: DynamoDBDocumentClient | undefined;

export const createDynamoDBClient = (): DynamoDBClient => {
  const config: DynamoDBClientConfig = isLocal()
    ? {
        endpoint: localDynamodbEndpoint(),
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'local',
          secretAccessKey: 'local',
        },
      }
    : {};

  return new DynamoDBClient(config);
};

// the client-dynamodb and lib-dynamodb @smithy/types resolutions differ, so `send` is widened
export type DocumentClient = DynamoDBDocumentClient & {
  send: (command: unknown) => Promise<Record<string, unknown>>;
};

export const getDocumentClient = (): DocumentClient => {
  if (!documentClient) {
    documentClient = DynamoDBDocumentClient.from(createDynamoDBClient(), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return documentClient as DocumentClient;
};

export const setDocumentClient = (
  client: DynamoDBDocumentClient | undefined,
): void => {
  documentClient = client;
};
