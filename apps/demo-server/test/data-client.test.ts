import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import * as config from '../src/config';
import {
  createDynamoDBClient,
  getDocumentClient,
  setDocumentClient,
} from '../src/data/client';

afterEach(() => {
  jest.restoreAllMocks();
  setDocumentClient(undefined);
});

describe('createDynamoDBClient', () => {
  it('talks to DynamoDB Local with throwaway credentials when running locally', async () => {
    jest.spyOn(config, 'isLocal').mockReturnValue(true);

    const client = createDynamoDBClient();

    expect(client.config.isCustomEndpoint).toBe(true);
    const endpoint = await client.config.endpoint!();
    expect(endpoint.hostname).toBe('localhost');
    expect(endpoint.port).toBe(8000);
    expect(await client.config.region()).toBe('us-east-1');
    const credentials = await client.config.credentials();
    expect(credentials.accessKeyId).toBe('local');
  });

  it('leaves the endpoint to the SDK when deployed', () => {
    jest.spyOn(config, 'isLocal').mockReturnValue(false);

    const client = createDynamoDBClient();

    expect(client.config.isCustomEndpoint).toBe(false);
    expect(client.config.endpoint).toBeUndefined();
  });
});

describe('the shared document client', () => {
  it('is built once and reused', () => {
    expect(getDocumentClient()).toBe(getDocumentClient());
  });

  it('takes an injected client, and builds a fresh one once it is cleared', () => {
    const injected = DynamoDBDocumentClient.from(createDynamoDBClient());
    setDocumentClient(injected);

    expect(getDocumentClient()).toBe(injected);

    setDocumentClient(undefined);

    expect(getDocumentClient()).not.toBe(injected);
  });
});
