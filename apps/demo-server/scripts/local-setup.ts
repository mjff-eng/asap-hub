import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3';

process.env.SLS_STAGE = process.env.SLS_STAGE || 'local';

const tableName = process.env.TABLE_NAME || 'demo-hub-local-data';
const bucketName = process.env.BUCKET_NAME || 'demo-hub-local-storage';
const dynamodbEndpoint =
  process.env.LOCAL_DYNAMODB_ENDPOINT || 'http://localhost:8000';
const s3Endpoint = process.env.LOCAL_S3_ENDPOINT || 'http://localhost:9010';

const dynamodb = new DynamoDBClient({
  endpoint: dynamodbEndpoint,
  region: 'us-east-1',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

const s3 = new S3Client({
  endpoint: s3Endpoint,
  forcePathStyle: true,
  region: 'us-east-1',
  credentials: { accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin' },
});

const setupTable = async (): Promise<void> => {
  try {
    await dynamodb.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`table ${tableName} already exists`);
    return;
  } catch {
    // falls through to creation
  }

  await dynamodb.send(
    new CreateTableCommand({
      TableName: tableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
        { AttributeName: 'GSI1PK', AttributeType: 'S' },
        { AttributeName: 'GSI1SK', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'GSI1',
          KeySchema: [
            { AttributeName: 'GSI1PK', KeyType: 'HASH' },
            { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    }),
  );
  console.log(`created table ${tableName}`);
};

const setupBucket = async (): Promise<void> => {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`bucket ${bucketName} already exists`);
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
    console.log(`created bucket ${bucketName}`);
  }

  // MinIO answers PutBucketCors with 501, it allows every origin by default instead
  try {
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedMethods: ['PUT', 'POST', 'GET', 'HEAD'],
              AllowedHeaders: ['*'],
              AllowedOrigins: ['*'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3000,
            },
          ],
        },
      }),
    );
    console.log(`applied CORS to ${bucketName}`);
  } catch {
    console.log(
      `skipped CORS on ${bucketName}, the server does not support it`,
    );
  }
};

// lets the Vite proxy stream media and project assets straight from MinIO; local dev only
const setupMediaReadPolicy = async (): Promise<void> => {
  try {
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [
                `arn:aws:s3:::${bucketName}/media/*`,
                // the studio previews source assets straight from the bucket,
                // the same way the deployed stack serves them behind a cookie
                `arn:aws:s3:::${bucketName}/projects/*`,
              ],
            },
          ],
        }),
      }),
    );
    console.log(`applied anonymous media read policy to ${bucketName}`);
  } catch (error) {
    console.log(`could not apply media read policy: ${String(error)}`);
  }
};

const main = async (): Promise<void> => {
  console.log(`dynamodb: ${dynamodbEndpoint}`);
  console.log(`s3: ${s3Endpoint}`);
  await setupTable();
  await setupBucket();
  await setupMediaReadPolicy();
  console.log('local demo-hub setup complete');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
