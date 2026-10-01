import { AWS } from '@serverless/typescript';
import assert from 'assert';

if (process.env.SLS_STAGE !== 'local') {
  [
    'AWS_ACM_CERTIFICATE_ARN',
    'AWS_REGION',
    'CLOUDFRONT_PUBLIC_KEY',
    'DEMO_AUTH0_AUDIENCE',
    'DEMO_AUTH0_CLIENT_ID',
    'DEMO_AUTH0_DOMAIN',
    'DEMO_HOSTNAME',
    'DEMO_SUBNET_IDS',
    'DEMO_VPC_ID',
    'EMAIL_SENDER',
    'HOSTED_ZONE_NAME',
    'SES_REGION',
    'SLS_STAGE',
  ].forEach((env) => {
    assert.ok(process.env[env], `${env} not defined`);
  });
}

const stage = process.env.SLS_STAGE!;
assert.ok(
  stage === 'dev' || stage === 'local',
  'SLS_STAGE must be either "dev" or "local"',
);

const region = process.env.AWS_REGION as NonNullable<AWS['provider']['region']>;
const service = 'demo-hub';

const demoHostname = process.env.DEMO_HOSTNAME!;
const hostedZoneName = process.env.HOSTED_ZONE_NAME!;
const awsAcmCertificateArn = process.env.AWS_ACM_CERTIFICATE_ARN!;
// DEMO_-prefixed so the repo's untracked .env (CRN's AUTH0_*) cannot shadow them
const auth0Domain =
  process.env.DEMO_AUTH0_DOMAIN || 'dev-asap-hub.us.auth0.com';
const auth0ClientId = process.env.DEMO_AUTH0_CLIENT_ID || '';
const auth0Audience =
  process.env.DEMO_AUTH0_AUDIENCE || 'https://demos.hub.asap.science';
const cloudfrontPublicKey = process.env.CLOUDFRONT_PUBLIC_KEY!;
const vpcId = process.env.DEMO_VPC_ID!;
const subnetIds = (process.env.DEMO_SUBNET_IDS || '')
  .split(',')
  .map((subnet) => subnet.trim())
  .filter(Boolean);
const ciCommitSha = process.env.CI_COMMIT_SHA;
const currentRevision = process.env.CURRENT_REVISION!;
const s3SyncEnabled = process.env.S3_SYNC_ENABLED !== 'false';
const sesRegion = process.env.SES_REGION || region;
const emailSender = process.env.EMAIL_SENDER || '';

const appUrl = `https://${demoHostname}`;
const localAppUrl = 'http://localhost:3500';
const nodeEnv = 'production';

const tableName = `${service}-${stage}-data`;
const storageBucketName = `${service}-${stage}-storage`;
const encoderName = `${service}-${stage}-encoder`;

export const plugins = [
  './serverless-plugins/serverless-esbuild',
  ...(s3SyncEnabled ? ['./serverless-plugins/serverless-s3-sync'] : []),
  ...(stage === 'local' ? ['./serverless-plugins/serverless-offline'] : []),
];

const serverlessConfig: AWS = {
  service,
  plugins,
  provider: {
    name: 'aws',
    runtime: 'nodejs24.x' as AWS['provider']['runtime'],
    architecture: 'arm64',
    timeout: 16,
    memorySize: 1024,
    region,
    stage,
    versionFunctions: false,
    logRetentionInDays: 30,
    httpApi: {
      payload: '2.0',
      cors: {
        allowedOrigins: stage === 'local' ? [localAppUrl] : [appUrl],
        allowCredentials: true,
        allowedMethods: ['OPTIONS', 'POST', 'GET', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['authorization', 'content-type', 'accept', 'origin'],
      },
      authorizers: {
        auth0: {
          type: 'jwt',
          identitySource: '$request.header.Authorization',
          issuerUrl: `https://${auth0Domain}/`,
          audience: [auth0Audience],
        },
      },
    },
    logs: {
      httpApi: {
        format:
          '{ "requestId":"$context.requestId", "ip": "$context.identity.sourceIp", "requestTime":"$context.requestTime", "httpMethod":"$context.httpMethod", "path":"$context.path", "routeKey":"$context.routeKey", "status":"$context.status","protocol":"$context.protocol", "responseLength":"$context.responseLength", "integrationRequestId": "$context.integration.requestId", "functionResponseStatus": "$context.integration.status" }',
      },
    },
    environment: {
      APP_ORIGIN: appUrl,
      NODE_ENV: nodeEnv,
      ENVIRONMENT: stage,
      REGION: region,
      NODE_OPTIONS: '--enable-source-maps',
      CURRENT_REVISION: ciCommitSha ?? currentRevision,
      DEMO_AUTH0_AUDIENCE: auth0Audience,
      DEMO_AUTH0_CLIENT_ID: auth0ClientId,
      DEMO_AUTH0_DOMAIN: auth0Domain,
      TABLE_NAME: tableName,
      BUCKET_NAME: storageBucketName,
      DEMO_HOSTNAME: demoHostname,
      SLS_STAGE: stage,
      SES_REGION: sesRegion,
      EMAIL_SENDER: emailSender,
      CLOUDFRONT_PRIVATE_KEY_PARAM: `/${service}/${stage}/cloudfront-private-key`,
      ...(stage === 'local' && process.env.LOCAL_DYNAMODB_ENDPOINT
        ? { LOCAL_DYNAMODB_ENDPOINT: process.env.LOCAL_DYNAMODB_ENDPOINT }
        : {}),
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            // the exact calls ElectroDB makes; a wildcard here also grants
            // DeleteTable, UpdateTable, UpdateTimeToLive and
            // UpdateContinuousBackups on the one table that holds everything
            Action: [
              'dynamodb:PutItem',
              'dynamodb:GetItem',
              'dynamodb:Query',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
            ],
            Resource: [
              {
                'Fn::Join': [
                  ':',
                  [
                    'arn:aws:dynamodb',
                    { Ref: 'AWS::Region' },
                    { Ref: 'AWS::AccountId' },
                    `table/${tableName}`,
                  ],
                ],
              },
              {
                'Fn::Join': [
                  ':',
                  [
                    'arn:aws:dynamodb',
                    { Ref: 'AWS::Region' },
                    { Ref: 'AWS::AccountId' },
                    `table/${tableName}/index/*`,
                  ],
                ],
              },
            ],
          },
          {
            Effect: 'Allow',
            // capture parts, merged event streams and render timeline snapshots
            // are written carrying the lifecycle tag the bucket rule filters on,
            // and S3 refuses a tagged PutObject unless PutObjectTagging is
            // granted too: s3:PutObject alone fails those writes with AccessDenied
            Action: [
              's3:PutObject',
              's3:PutObjectTagging',
              's3:GetObject',
              's3:DeleteObject',
              's3:AbortMultipartUpload',
              's3:ListMultipartUploadParts',
            ],
            Resource: {
              'Fn::Join': [
                '',
                [{ 'Fn::GetAtt': ['StorageBucket', 'Arn'] }, '/*'],
              ],
            },
          },
          {
            Effect: 'Allow',
            Action: ['s3:ListBucket', 's3:ListBucketMultipartUploads'],
            Resource: { 'Fn::GetAtt': ['StorageBucket', 'Arn'] },
          },
          {
            Effect: 'Allow',
            Action: ['ssm:GetParameter'],
            Resource: {
              'Fn::Join': [
                ':',
                [
                  'arn:aws:ssm',
                  { Ref: 'AWS::Region' },
                  { Ref: 'AWS::AccountId' },
                  `parameter/${service}/${stage}/cloudfront-private-key`,
                ],
              ],
            },
          },
          {
            Effect: 'Allow',
            // '*' would let this lambda send from every identity the account
            // has verified, CRN's and GP2's included
            Action: ['ses:SendEmail', 'ses:SendRawEmail'],
            Resource: {
              'Fn::Join': [
                ':',
                [
                  'arn:aws:ses',
                  sesRegion,
                  { Ref: 'AWS::AccountId' },
                  `identity/${emailSender}`,
                ],
              ],
            },
          },
          {
            Effect: 'Allow',
            Action: ['ecs:RunTask'],
            Resource: { Ref: 'EncoderTaskDefinition' },
          },
          {
            Effect: 'Allow',
            Action: ['ecs:StopTask'],
            Resource: {
              'Fn::Join': [
                ':',
                [
                  'arn:aws:ecs',
                  { Ref: 'AWS::Region' },
                  { Ref: 'AWS::AccountId' },
                  `task/${encoderName}/*`,
                ],
              ],
            },
          },
          {
            Effect: 'Allow',
            Action: ['iam:PassRole'],
            Resource: [
              { 'Fn::GetAtt': ['EncoderTaskRole', 'Arn'] },
              { 'Fn::GetAtt': ['EncoderTaskExecutionRole', 'Arn'] },
            ],
          },
        ],
      },
    },
  },
  package: {
    individually: true,
    excludeDevDependencies: false,
  },
  custom: {
    demoHostname,
    // always defined like CRN's: deploy --package reads custom.* from the
    // packaged state, which is built with the sync plugin disabled
    s3Sync: [
      {
        bucketName: '${self:service}-${self:provider.stage}-frontend',
        deleteRemoved: false,
        localDir: '../demo-frontend/dist',
      },
    ],
    esbuild: {
      packager: 'yarn',
      platform: 'node',
      target: 'node24',
      bundle: true,
      concurrency: 1,
    },
    'serverless-offline': {
      httpPort: 5555,
      ignoreJWTSignature: true,
      // local /media/* streams large files through the handler; the emulated
      // 16s lambda timeout would cut playback off (deployed media bypasses lambda)
      noTimeout: true,
      corsAllowOrigin: localAppUrl,
      useWorkerThreads: false,
    },
  },
  functions: {
    apiHandler: {
      handler: './src/handlers/api-handler.apiHandler',
      environment: {
        CLOUDFRONT_KEY_PAIR_ID: { Ref: 'CloudFrontSigningPublicKey' },
        // what the ECS job runner needs to start a task on the encoder cluster
        ENCODER_CLUSTER: { 'Fn::GetAtt': ['EncoderCluster', 'Arn'] },
        ENCODER_TASK_DEFINITION: { Ref: 'EncoderTaskDefinition' },
        ENCODER_SUBNET_IDS: subnetIds.join(','),
        ENCODER_SECURITY_GROUP_ID: {
          'Fn::GetAtt': ['EncoderSecurityGroup', 'GroupId'],
        },
      },
      events: [
        {
          httpApi: {
            method: 'GET',
            path: '/api/health',
          },
        },
        // the capture snippet runs on the site being demoed, so it carries a
        // short lived session token instead of the creator's Auth0 token
        {
          httpApi: {
            method: 'POST',
            path: '/api/capture',
          },
        },
        // deployed, /media/* is served by CloudFront with signed cookies and never reaches lambda
        ...(stage === 'local'
          ? [
              {
                httpApi: {
                  method: 'GET' as const,
                  path: '/media/{proxy+}',
                },
              },
            ]
          : []),
        {
          httpApi: {
            method: '*',
            path: '*',
            authorizer: {
              name: 'auth0',
            },
          },
        },
      ],
    },
  },
  resources: {
    Resources: {
      DataTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
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
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
          },
          // DynamoDB reads a TTL attribute as epoch seconds, and the sessions'
          // expiresAt is in milliseconds, so the rows carry a separate ttl
          TimeToLiveSpecification: {
            AttributeName: 'ttl',
            Enabled: true,
          },
        },
      },
      StorageBucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: storageBucketName,
          PublicAccessBlockConfiguration: {
            BlockPublicPolicy: true,
            BlockPublicAcls: true,
            IgnorePublicAcls: true,
            RestrictPublicBuckets: true,
          },
          NotificationConfiguration: {
            EventBridgeConfiguration: {
              EventBridgeEnabled: true,
            },
          },
          LifecycleConfiguration: {
            Rules: [
              {
                Id: 'abort-incomplete-multipart-uploads',
                Status: 'Enabled',
                AbortIncompleteMultipartUpload: {
                  DaysAfterInitiation: 7,
                },
              },
              {
                Id: 'expire-raw-uploads',
                Status: 'Enabled',
                Prefix: 'raw/',
                ExpirationInDays: 30,
              },
              {
                Id: 'archive-media',
                Status: 'Enabled',
                Prefix: 'media/',
                Transitions: [
                  {
                    StorageClass: 'GLACIER_IR',
                    TransitionInDays: 90,
                  },
                ],
              },
              // projects/{id}/capture/ and projects/{id}/renders/ hold nothing
              // but intermediates, but a lifecycle prefix cannot carry the
              // wildcard that would name them, so the writes tag themselves and
              // these rules filter on the tag. projects/{id}/timeline/ is
              // deliberately left alone: the item's pointer names a live object.
              {
                Id: 'expire-capture-intermediates',
                Status: 'Enabled',
                TagFilters: [{ Key: 'lifecycle', Value: 'capture' }],
                ExpirationInDays: 30,
              },
              {
                Id: 'expire-render-intermediates',
                Status: 'Enabled',
                TagFilters: [{ Key: 'lifecycle', Value: 'render' }],
                ExpirationInDays: 30,
              },
            ],
          },
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedMethods: ['PUT', 'POST', 'GET', 'HEAD'],
                AllowedHeaders: ['*'],
                AllowedOrigins: [appUrl, localAppUrl],
                // browser multipart completion reads the part ETags
                ExposedHeaders: ['ETag'],
                MaxAge: 3000,
              },
            ],
          },
        },
      },
      BucketPolicyStorage: {
        Type: 'AWS::S3::BucketPolicy',
        Properties: {
          Bucket: { Ref: 'StorageBucket' },
          PolicyDocument: {
            Statement: [
              {
                Action: ['s3:GetObject'],
                Effect: 'Allow',
                Principal: {
                  CanonicalUser: {
                    'Fn::GetAtt': [
                      'CloudFrontOriginAccessIdentityMedia',
                      'S3CanonicalUserId',
                    ],
                  },
                },
                Resource: [
                  {
                    'Fn::Join': [
                      '',
                      [{ 'Fn::GetAtt': ['StorageBucket', 'Arn'] }, '/media/*'],
                    ],
                  },
                  {
                    'Fn::Join': [
                      '',
                      [
                        { 'Fn::GetAtt': ['StorageBucket', 'Arn'] },
                        '/projects/*',
                      ],
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      FrontendBucket: {
        Type: 'AWS::S3::Bucket',
        DeletionPolicy: 'Delete',
        Properties: {
          BucketName: '${self:service}-${self:provider.stage}-frontend',
          OwnershipControls: {
            Rules: [
              {
                ObjectOwnership: 'BucketOwnerPreferred',
              },
            ],
          },
          // served only through the CloudFront OAI, so nothing here needs to
          // be reachable publicly
          PublicAccessBlockConfiguration: {
            BlockPublicPolicy: true,
            BlockPublicAcls: true,
            IgnorePublicAcls: true,
            RestrictPublicBuckets: true,
          },
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedMethods: ['GET', 'HEAD'],
                AllowedHeaders: ['*'],
                AllowedOrigins: ['*'],
                MaxAge: 3000,
              },
            ],
          },
        },
      },
      BucketPolicyFrontend: {
        Type: 'AWS::S3::BucketPolicy',
        Properties: {
          Bucket: { Ref: 'FrontendBucket' },
          PolicyDocument: {
            Statement: [
              {
                Action: ['s3:GetObject'],
                Effect: 'Allow',
                Principal: {
                  CanonicalUser: {
                    'Fn::GetAtt': [
                      'CloudFrontOriginAccessIdentityFrontend',
                      'S3CanonicalUserId',
                    ],
                  },
                },
                Resource: {
                  'Fn::Join': [
                    '',
                    [{ 'Fn::GetAtt': ['FrontendBucket', 'Arn'] }, '/*'],
                  ],
                },
              },
              {
                Action: ['s3:ListBucket'],
                Effect: 'Allow',
                Principal: {
                  CanonicalUser: {
                    'Fn::GetAtt': [
                      'CloudFrontOriginAccessIdentityFrontend',
                      'S3CanonicalUserId',
                    ],
                  },
                },
                Resource: { 'Fn::GetAtt': ['FrontendBucket', 'Arn'] },
              },
            ],
          },
        },
      },
      CloudFrontOriginAccessIdentityFrontend: {
        Type: 'AWS::CloudFront::CloudFrontOriginAccessIdentity',
        Properties: {
          CloudFrontOriginAccessIdentityConfig: {
            Comment: { Ref: 'FrontendBucket' },
          },
        },
      },
      CloudFrontOriginAccessIdentityMedia: {
        Type: 'AWS::CloudFront::CloudFrontOriginAccessIdentity',
        Properties: {
          CloudFrontOriginAccessIdentityConfig: {
            Comment: { Ref: 'StorageBucket' },
          },
        },
      },
      CloudFrontSigningPublicKey: {
        Type: 'AWS::CloudFront::PublicKey',
        Properties: {
          PublicKeyConfig: {
            // must never change for an existing key, CloudFront treats it as the identity of the config
            CallerReference: `${service}-${stage}-signing-key-v1`,
            Name: `${service}-${stage}-signing-key-v1`,
            EncodedKey: cloudfrontPublicKey,
          },
        },
      },
      CloudFrontSigningKeyGroup: {
        Type: 'AWS::CloudFront::KeyGroup',
        Properties: {
          KeyGroupConfig: {
            Name: `${service}-${stage}-signing-key-group`,
            Items: [{ Ref: 'CloudFrontSigningPublicKey' }],
          },
        },
      },
      // the SPA fallback has to be scoped to the frontend behaviour: a
      // distribution-level CustomErrorResponse rewrites every /api/* 404 into a
      // 200 carrying index.html, which the client then tries to JSON.parse
      SpaFallbackFunction: {
        Type: 'AWS::CloudFront::Function',
        Properties: {
          Name: `${service}-${stage}-spa-fallback`,
          AutoPublish: true,
          FunctionConfig: {
            Comment: 'Serves index.html for extension-less frontend routes',
            Runtime: 'cloudfront-js-2.0',
          },
          FunctionCode: [
            'function handler(event) {',
            '  var request = event.request;',
            '  var uri = request.uri;',
            "  if (uri.indexOf('/api/') === 0 || uri.indexOf('/media/') === 0) {",
            '    return request;',
            '  }',
            "  var segment = uri.substring(uri.lastIndexOf('/') + 1);",
            "  if (segment === '') {",
            "    request.uri = uri + 'index.html';",
            "  } else if (segment.indexOf('.') === -1) {",
            "    request.uri = '/index.html';",
            '  }',
            '  return request;',
            '}',
          ].join('\n'),
        },
      },
      CloudFrontDistribution: {
        Type: 'AWS::CloudFront::Distribution',
        DependsOn: ['FrontendBucket', 'StorageBucket'],
        Properties: {
          DistributionConfig: {
            Aliases: [demoHostname],
            Origins: [
              {
                DomainName: {
                  'Fn::GetAtt': ['FrontendBucket', 'RegionalDomainName'],
                },
                Id: 's3origin-frontend',
                S3OriginConfig: {
                  OriginAccessIdentity: {
                    'Fn::Join': [
                      '/',
                      [
                        'origin-access-identity/cloudfront',
                        { Ref: 'CloudFrontOriginAccessIdentityFrontend' },
                      ],
                    ],
                  },
                },
              },
              {
                DomainName: {
                  'Fn::GetAtt': ['StorageBucket', 'RegionalDomainName'],
                },
                Id: 's3origin-media',
                S3OriginConfig: {
                  OriginAccessIdentity: {
                    'Fn::Join': [
                      '/',
                      [
                        'origin-access-identity/cloudfront',
                        { Ref: 'CloudFrontOriginAccessIdentityMedia' },
                      ],
                    ],
                  },
                },
              },
              {
                CustomOriginConfig: {
                  OriginProtocolPolicy: 'https-only',
                },
                DomainName: {
                  'Fn::Join': [
                    '.',
                    [
                      { Ref: 'HttpApi' },
                      'execute-api',
                      { Ref: 'AWS::Region' },
                      { Ref: 'AWS::URLSuffix' },
                    ],
                  ],
                },
                Id: 'apigw',
              },
            ],
            DefaultCacheBehavior: {
              AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
              CachedMethods: ['GET', 'HEAD', 'OPTIONS'],
              Compress: true,
              DefaultTTL: 3600,
              ForwardedValues: {
                Cookies: {
                  Forward: 'none',
                },
                QueryString: false,
              },
              TargetOriginId: 's3origin-frontend',
              ViewerProtocolPolicy: 'redirect-to-https',
              FunctionAssociations: [
                {
                  EventType: 'viewer-request',
                  FunctionARN: {
                    'Fn::GetAtt': ['SpaFallbackFunction', 'FunctionARN'],
                  },
                },
              ],
            },
            CacheBehaviors: [
              {
                PathPattern: '/api/*',
                AllowedMethods: [
                  'GET',
                  'HEAD',
                  'OPTIONS',
                  'PUT',
                  'POST',
                  'PATCH',
                  'DELETE',
                ],
                CachedMethods: ['GET', 'HEAD', 'OPTIONS'],
                Compress: true,
                MinTTL: 0,
                DefaultTTL: 0,
                MaxTTL: 0,
                ForwardedValues: {
                  // 'none' makes CloudFront strip Set-Cookie from responses,
                  // which silently discards the signed media cookies; TTLs are
                  // all zero so forwarding cookies cannot poison a cache
                  Cookies: {
                    Forward: 'all',
                  },
                  QueryString: true,
                  Headers: [
                    'Authorization',
                    'Content-Type',
                    'Accept',
                    'Origin',
                    'Referer',
                  ],
                },
                TargetOriginId: 'apigw',
                ViewerProtocolPolicy: 'redirect-to-https',
              },
              {
                // the studio plays the ingested sources straight from storage;
                // without this they fall through to the frontend bucket and the
                // editor shows a black frame where the recording should be
                PathPattern: '/projects/*',
                AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
                CachedMethods: ['GET', 'HEAD', 'OPTIONS'],
                Compress: false,
                MinTTL: 0,
                DefaultTTL: 86400,
                MaxTTL: 31536000,
                ForwardedValues: {
                  Cookies: {
                    Forward: 'none',
                  },
                  QueryString: false,
                },
                TrustedKeyGroups: [{ Ref: 'CloudFrontSigningKeyGroup' }],
                TargetOriginId: 's3origin-media',
                ViewerProtocolPolicy: 'redirect-to-https',
              },
              {
                PathPattern: '/media/*',
                AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
                CachedMethods: ['GET', 'HEAD', 'OPTIONS'],
                // video bytes are already compressed
                Compress: false,
                MinTTL: 0,
                DefaultTTL: 86400,
                MaxTTL: 31536000,
                ForwardedValues: {
                  Cookies: {
                    Forward: 'none',
                  },
                  QueryString: false,
                },
                TrustedKeyGroups: [{ Ref: 'CloudFrontSigningKeyGroup' }],
                TargetOriginId: 's3origin-media',
                ViewerProtocolPolicy: 'redirect-to-https',
              },
            ],
            DefaultRootObject: 'index.html',
            Enabled: true,
            PriceClass: 'PriceClass_100',
            ViewerCertificate: {
              AcmCertificateArn: awsAcmCertificateArn,
              MinimumProtocolVersion: 'TLSv1.2_2018',
              SslSupportMethod: 'sni-only',
            },
          },
        },
      },
      CloudFrontRecordSetGroup: {
        Type: 'AWS::Route53::RecordSetGroup',
        Properties: {
          HostedZoneName: `${hostedZoneName}.`,
          RecordSets: [
            {
              Name: demoHostname,
              Type: 'A',
              AliasTarget: {
                DNSName: {
                  'Fn::GetAtt': ['CloudFrontDistribution', 'DomainName'],
                },
                // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-route53-aliastarget.html#cfn-route53-aliastarget-hostedzoneid
                HostedZoneId: 'Z2FDTNDATAQYW2',
              },
            },
          ],
        },
      },
      EncoderRepository: {
        Type: 'AWS::ECR::Repository',
        Properties: {
          RepositoryName: encoderName,
          LifecyclePolicy: {
            LifecyclePolicyText: JSON.stringify({
              rules: [
                {
                  rulePriority: 1,
                  description: 'Keep the last 5 images',
                  selection: {
                    tagStatus: 'any',
                    countType: 'imageCountMoreThan',
                    countNumber: 5,
                  },
                  action: { type: 'expire' },
                },
              ],
            }),
          },
        },
      },
      EncoderLogGroup: {
        Type: 'AWS::Logs::LogGroup',
        Properties: {
          LogGroupName: `/ecs/${encoderName}`,
          RetentionInDays: 30,
        },
      },
      EncoderCluster: {
        Type: 'AWS::ECS::Cluster',
        Properties: {
          ClusterName: encoderName,
        },
      },
      EncoderSecurityGroup: {
        Type: 'AWS::EC2::SecurityGroup',
        Properties: {
          GroupDescription: `Egress only security group for ${encoderName}`,
          VpcId: vpcId,
          SecurityGroupEgress: [
            {
              IpProtocol: '-1',
              CidrIp: '0.0.0.0/0',
              Description: 'Allow all outbound traffic',
            },
          ],
        },
      },
      EncoderTaskExecutionRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { Service: 'ecs-tasks.amazonaws.com' },
                Action: 'sts:AssumeRole',
              },
            ],
          },
          ManagedPolicyArns: [
            'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
          ],
        },
      },
      EncoderTaskRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { Service: 'ecs-tasks.amazonaws.com' },
                Action: 'sts:AssumeRole',
              },
            ],
          },
          Policies: [
            {
              PolicyName: `${encoderName}-task-policy`,
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: ['s3:GetObject'],
                    Resource: {
                      'Fn::Join': [
                        '',
                        [{ 'Fn::GetAtt': ['StorageBucket', 'Arn'] }, '/raw/*'],
                      ],
                    },
                  },
                  {
                    Effect: 'Allow',
                    // `aws s3 cp` carries no tagging option, so the job tags each
                    // upload in a second call and strips the tag again once the
                    // render is accepted. Those are two distinct actions:
                    // PutObjectTagging does not cover DeleteObjectTagging, and
                    // without the delete the published media keeps lifecycle=render
                    // and the bucket rule removes it thirty days later
                    Action: [
                      's3:PutObject',
                      's3:PutObjectTagging',
                      's3:DeleteObjectTagging',
                    ],
                    Resource: {
                      'Fn::Join': [
                        '',
                        [
                          { 'Fn::GetAtt': ['StorageBucket', 'Arn'] },
                          '/media/*',
                        ],
                      ],
                    },
                  },
                  {
                    // studio sources, proxies and renders all live under projects/
                    Effect: 'Allow',
                    Action: ['s3:GetObject', 's3:PutObject'],
                    Resource: {
                      'Fn::Join': [
                        '',
                        [
                          { 'Fn::GetAtt': ['StorageBucket', 'Arn'] },
                          '/projects/*',
                        ],
                      ],
                    },
                  },
                  {
                    Effect: 'Allow',
                    // the render job queries the project's asset rows before it
                    // can download anything the timeline references
                    Action: ['dynamodb:UpdateItem', 'dynamodb:Query'],
                    Resource: { 'Fn::GetAtt': ['DataTable', 'Arn'] },
                    // this container runs ffmpeg over creator-supplied media,
                    // so it only ever reaches the video partitions: user rows
                    // live under USER# and must stay out of its reach
                    Condition: {
                      'ForAllValues:StringLike': {
                        'dynamodb:LeadingKeys': ['VIDEO#*'],
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      EncoderTaskDefinition: {
        Type: 'AWS::ECS::TaskDefinition',
        Properties: {
          Family: encoderName,
          RequiresCompatibilities: ['FARGATE'],
          NetworkMode: 'awsvpc',
          // 16 vCPU runs the encoder pool at its full four lanes; Fargate
          // bills by vCPU-second, so the bigger task costs the same per
          // export and finishes four times sooner
          Cpu: '16384',
          Memory: '32768',
          // a render pulls every source of a project onto the task, the 20 GiB
          // Fargate default is not enough for that
          EphemeralStorage: { SizeInGiB: 100 },
          RuntimePlatform: {
            CpuArchitecture: 'ARM64',
            OperatingSystemFamily: 'LINUX',
          },
          ExecutionRoleArn: {
            'Fn::GetAtt': ['EncoderTaskExecutionRole', 'Arn'],
          },
          TaskRoleArn: { 'Fn::GetAtt': ['EncoderTaskRole', 'Arn'] },
          ContainerDefinitions: [
            {
              Name: 'encoder',
              Image: {
                'Fn::Join': [
                  '',
                  [
                    { 'Fn::GetAtt': ['EncoderRepository', 'RepositoryUri'] },
                    ':latest',
                  ],
                ],
              },
              Essential: true,
              Environment: [
                { Name: 'BUCKET_NAME', Value: storageBucketName },
                { Name: 'TABLE_NAME', Value: tableName },
                { Name: 'REGION', Value: region },
              ],
              LogConfiguration: {
                LogDriver: 'awslogs',
                Options: {
                  'awslogs-group': `/ecs/${encoderName}`,
                  'awslogs-region': region,
                  'awslogs-stream-prefix': 'encoder',
                },
              },
            },
          ],
        },
      },
      EncoderEventsRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { Service: 'events.amazonaws.com' },
                Action: 'sts:AssumeRole',
              },
            ],
          },
          Policies: [
            {
              PolicyName: `${encoderName}-events-policy`,
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: ['ecs:RunTask'],
                    Resource: { Ref: 'EncoderTaskDefinition' },
                  },
                  {
                    Effect: 'Allow',
                    Action: ['iam:PassRole'],
                    Resource: [
                      { 'Fn::GetAtt': ['EncoderTaskRole', 'Arn'] },
                      { 'Fn::GetAtt': ['EncoderTaskExecutionRole', 'Arn'] },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
      EncoderRule: {
        Type: 'AWS::Events::Rule',
        Properties: {
          Name: `${encoderName}-raw-object-created`,
          Description: 'Start an encode task when a raw upload lands in S3',
          EventPattern: {
            source: ['aws.s3'],
            'detail-type': ['Object Created'],
            detail: {
              bucket: { name: [storageBucketName] },
              object: { key: [{ prefix: 'raw/' }] },
            },
          },
          Targets: [
            {
              Id: 'encoder-task',
              Arn: { 'Fn::GetAtt': ['EncoderCluster', 'Arn'] },
              RoleArn: { 'Fn::GetAtt': ['EncoderEventsRole', 'Arn'] },
              EcsParameters: {
                TaskDefinitionArn: { Ref: 'EncoderTaskDefinition' },
                LaunchType: 'FARGATE',
                TaskCount: 1,
                PlatformVersion: 'LATEST',
                NetworkConfiguration: {
                  AwsVpcConfiguration: {
                    AssignPublicIp: 'ENABLED',
                    Subnets: subnetIds,
                    SecurityGroups: [
                      { 'Fn::GetAtt': ['EncoderSecurityGroup', 'GroupId'] },
                    ],
                  },
                },
              },
              InputTransformer: {
                InputPathsMap: {
                  objectKey: '$.detail.object.key',
                },
                InputTemplate: JSON.stringify({
                  containerOverrides: [
                    {
                      name: 'encoder',
                      environment: [
                        { name: 'S3_OBJECT_KEY', value: '<objectKey>' },
                      ],
                    },
                  ],
                }),
              },
            },
          ],
        },
      },
    },
  },
};

module.exports = serverlessConfig;
