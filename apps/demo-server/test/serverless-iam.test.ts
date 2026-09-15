import type { AWS } from '@serverless/typescript';

// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
const config = require('../serverless') as AWS;

// the config reads these once at module scope, so the expectations are built
// from the same values rather than from a literal
const sesRegion = process.env.SES_REGION || process.env.AWS_REGION;
const emailSender = process.env.EMAIL_SENDER || '';

const joinedSegments = (resource: unknown): string[] =>
  ((resource as { 'Fn::Join': [string, unknown[]] })['Fn::Join'][1] ?? []).map(
    String,
  );

type Statement = {
  Effect: string;
  Action: string | string[];
  Resource?: unknown;
  Condition?: unknown;
};

const apiStatements = (): Statement[] =>
  (config.provider.iam as { role: { statements: Statement[] } }).role
    .statements;

const actionsOf = (statement: Statement): string[] =>
  Array.isArray(statement.Action) ? statement.Action : [statement.Action];

const statementFor = (statements: Statement[], prefix: string): Statement => {
  const found = statements.find((statement) =>
    actionsOf(statement).some((action) => action.startsWith(prefix)),
  );
  if (!found) {
    throw new Error(`no statement for ${prefix}`);
  }
  return found;
};

const statementForPrefix = (
  statements: Statement[],
  prefix: string,
): Statement => {
  const found = statements.find((statement) =>
    joinedSegments(statement.Resource).some((segment) =>
      segment.startsWith(`/${prefix}/`),
    ),
  );
  if (!found) {
    throw new Error(`no statement for the ${prefix}/ prefix`);
  }
  return found;
};

const encoderStatements = (): Statement[] => {
  const resources = config.resources?.Resources as unknown as Record<
    string,
    {
      Properties: {
        Policies: { PolicyDocument: { Statement: Statement[] } }[];
      };
    }
  >;
  return resources.EncoderTaskRole!.Properties.Policies[0]!.PolicyDocument
    .Statement;
};

describe('the api lambda role', () => {
  // a wildcard here also grants DeleteTable, UpdateTable, UpdateTimeToLive and
  // UpdateContinuousBackups on the one table that holds everything
  it('names the exact dynamodb calls rather than wildcards', () => {
    const actions = actionsOf(statementFor(apiStatements(), 'dynamodb:'));

    expect(actions.sort()).toEqual([
      'dynamodb:DeleteItem',
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:Query',
      'dynamodb:UpdateItem',
    ]);
    expect(actions.some((action) => action.includes('*'))).toBe(false);
  });

  it('does not grant the unused s3:PutObjectAcl', () => {
    const actions = apiStatements().flatMap(actionsOf);

    expect(actions).not.toContain('s3:PutObjectAcl');
  });

  // capture parts, merged event streams and render timeline snapshots all carry
  // the lifecycle tag, and S3 refuses a tagged PutObject without this action
  it('can tag the objects it writes with a lifecycle tag', () => {
    const actions = actionsOf(statementFor(apiStatements(), 's3:PutObject'));

    expect(actions).toContain('s3:PutObject');
    expect(actions).toContain('s3:PutObjectTagging');
  });

  // '*' would let the lambda send from every identity verified in the account,
  // CRN's and GP2's included
  it('scopes ses to the configured sender identity', () => {
    const statement = statementFor(apiStatements(), 'ses:');

    expect(statement.Resource).not.toBe('*');
    expect(statement.Resource).toEqual({
      'Fn::Join': [
        ':',
        [
          'arn:aws:ses',
          sesRegion,
          { Ref: 'AWS::AccountId' },
          `identity/${emailSender}`,
        ],
      ],
    });
    expect(joinedSegments(statement.Resource)[3]).toMatch(/^identity\//);
  });
});

describe('the encoder task role', () => {
  // the container runs ffmpeg over creator-supplied media, so a compromise
  // could otherwise set role=admin on a USER# row
  it('is confined to the video partitions of the table', () => {
    const statement = statementFor(encoderStatements(), 'dynamodb:');

    expect(statement.Condition).toEqual({
      'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['VIDEO#*'] },
    });
  });

  it('still has the calls the render job makes', () => {
    const actions = actionsOf(statementFor(encoderStatements(), 'dynamodb:'));

    expect(actions.sort()).toEqual(['dynamodb:Query', 'dynamodb:UpdateItem']);
  });

  // `aws s3 cp` cannot tag, so the job tags each upload in a second call and
  // strips the tag again on acceptance; a delete left ungranted would leave the
  // published media carrying lifecycle=render for the bucket rule to collect
  it('can both tag and untag the media it publishes', () => {
    const actions = actionsOf(statementForPrefix(encoderStatements(), 'media'));

    expect(actions).toContain('s3:PutObject');
    expect(actions).toContain('s3:PutObjectTagging');
    expect(actions).toContain('s3:DeleteObjectTagging');
  });

  it('does not tag outside the media prefix', () => {
    const actions = actionsOf(
      statementForPrefix(encoderStatements(), 'projects'),
    );

    expect(actions.some((action) => action.endsWith('Tagging'))).toBe(false);
  });
});
