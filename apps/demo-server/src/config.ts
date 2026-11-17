export const isLocal = (): boolean => process.env.SLS_STAGE === 'local';

export const getTableName = (): string =>
  process.env.TABLE_NAME || (isLocal() ? 'demo-hub-local-data' : '');

export const getBucketName = (): string =>
  process.env.BUCKET_NAME || (isLocal() ? 'demo-hub-local-storage' : '');

export const getRegion = (): string =>
  process.env.REGION || process.env.AWS_REGION || 'us-east-1';

export const getStage = (): string => process.env.SLS_STAGE || 'dev';

export const localDynamodbEndpoint = (): string =>
  process.env.LOCAL_DYNAMODB_ENDPOINT || 'http://localhost:8000';

export const localS3Endpoint = (): string =>
  process.env.LOCAL_S3_ENDPOINT || 'http://localhost:9010';

export const getDemoHostname = (): string => process.env.DEMO_HOSTNAME || '';

export const getCloudFrontKeyPairId = (): string =>
  process.env.CLOUDFRONT_KEY_PAIR_ID || '';

export const getCloudFrontPrivateKeyParameter = (): string =>
  process.env.CLOUDFRONT_PRIVATE_KEY_PARAM ||
  `/demo-hub/${getStage()}/cloudfront-private-key`;

export const getSesRegion = (): string => process.env.SES_REGION || getRegion();

export const getEmailSender = (): string => process.env.EMAIL_SENDER || '';

export const getAuth0Domain = (): string =>
  process.env.DEMO_AUTH0_DOMAIN || 'dev-asap-hub.us.auth0.com';
