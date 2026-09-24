/* eslint-disable import/first */
import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { getSignedCookies } from '@aws-sdk/cloudfront-signer';
import {
  buildSignedCookies,
  resetPrivateKeyCache,
  signedCookieTtlMs,
} from '../src/signed-cookies';
/* eslint-enable import/first */

const mockSsmSend = jest.fn();

jest.mock('@aws-sdk/client-ssm', () => {
  const actual = jest.requireActual('@aws-sdk/client-ssm');
  return {
    ...actual,
    SSMClient: jest.fn().mockImplementation(() => ({
      send: (...args: unknown[]) => mockSsmSend(...args),
    })),
  };
});

jest.mock('@aws-sdk/cloudfront-signer', () => ({
  getSignedCookies: jest.fn(),
}));

jest.mock('../src/config', () => ({
  getCloudFrontKeyPairId: () => 'KEYPAIR123',
  getCloudFrontPrivateKeyParameter: () =>
    '/demo-hub/dev/cloudfront-private-key',
  getDemoHostname: () => 'demos.example.org',
  getRegion: () => 'eu-west-1',
}));

const mockGetSignedCookies = getSignedCookies as jest.MockedFunction<
  typeof getSignedCookies
>;

const cookieSet = {
  'CloudFront-Policy': 'policy-value',
  'CloudFront-Signature': 'signature-value',
  'CloudFront-Key-Pair-Id': 'KEYPAIR123',
};

beforeEach(() => {
  resetPrivateKeyCache();
  mockSsmSend.mockReset().mockResolvedValue({
    Parameter: { Value: '-----BEGIN RSA PRIVATE KEY-----' },
  });
  mockGetSignedCookies.mockReset().mockReturnValue(cookieSet);
});

describe('buildSignedCookies', () => {
  it('reads the decrypted signing key from the configured SSM parameter', async () => {
    await buildSignedCookies('video-1');

    expect(mockSsmSend).toHaveBeenCalledTimes(1);
    const command = mockSsmSend.mock.calls[0]![0];
    expect(command).toBeInstanceOf(GetParameterCommand);
    expect(command.input).toEqual({
      Name: '/demo-hub/dev/cloudfront-private-key',
      WithDecryption: true,
    });
  });

  it('scopes the url and the policy resource to the video prefix', async () => {
    await buildSignedCookies('video-1');

    const args = mockGetSignedCookies.mock.calls[0]![0];
    expect(args.url).toBe('https://demos.example.org/media/video-1/*');
    expect(args.keyPairId).toBe('KEYPAIR123');
    expect(args.privateKey).toBe('-----BEGIN RSA PRIVATE KEY-----');

    const policy = JSON.parse(args.policy as string);
    expect(policy.Statement).toHaveLength(1);
    expect(policy.Statement[0].Resource).toBe(
      'https://demos.example.org/media/video-1/*',
    );
  });

  it('expires the policy twelve hours out, in whole epoch seconds', async () => {
    const now = Date.parse('2026-08-18T12:00:00.000Z');

    await buildSignedCookies('video-1', 'media', now);

    const policy = JSON.parse(
      mockGetSignedCookies.mock.calls[0]![0].policy as string,
    );
    const epoch = policy.Statement[0].Condition.DateLessThan['AWS:EpochTime'];

    expect(signedCookieTtlMs).toBe(12 * 60 * 60 * 1000);
    expect(epoch).toBe((now + signedCookieTtlMs) / 1000);
    expect(epoch - now / 1000).toBe(12 * 60 * 60);
    expect(Number.isInteger(epoch)).toBe(true);
  });

  it('floors a sub-second now to whole epoch seconds', async () => {
    const now = Date.parse('2026-08-18T12:00:00.000Z') + 999;

    await buildSignedCookies('video-1', 'media', now);

    const policy = JSON.parse(
      mockGetSignedCookies.mock.calls[0]![0].policy as string,
    );
    const epoch = policy.Statement[0].Condition.DateLessThan['AWS:EpochTime'];

    expect(Number.isInteger(epoch)).toBe(true);
    expect(epoch).toBe(Math.floor((now + signedCookieTtlMs) / 1000));
  });

  it('defaults the expiry window to twelve hours past the current clock', async () => {
    const before = Date.now();
    await buildSignedCookies('video-1');
    const after = Date.now();

    const policy = JSON.parse(
      mockGetSignedCookies.mock.calls[0]![0].policy as string,
    );
    const epoch = policy.Statement[0].Condition.DateLessThan['AWS:EpochTime'];

    expect(epoch).toBeGreaterThanOrEqual(
      Math.floor((before + signedCookieTtlMs) / 1000),
    );
    expect(epoch).toBeLessThanOrEqual(
      Math.floor((after + signedCookieTtlMs) / 1000),
    );
  });

  it('returns every cookie the signer produced as name/value pairs', async () => {
    const cookies = await buildSignedCookies('video-1');

    expect(cookies).toEqual([
      { name: 'CloudFront-Policy', value: 'policy-value' },
      { name: 'CloudFront-Signature', value: 'signature-value' },
      { name: 'CloudFront-Key-Pair-Id', value: 'KEYPAIR123' },
    ]);
  });

  it('stringifies non-string cookie values', async () => {
    mockGetSignedCookies.mockReturnValue({
      'CloudFront-Expires': 1234567890,
    } as unknown as ReturnType<typeof getSignedCookies>);

    const cookies = await buildSignedCookies('video-1');

    expect(cookies).toEqual([
      { name: 'CloudFront-Expires', value: '1234567890' },
    ]);
  });

  it('caches the signing key so SSM is hit only once across videos', async () => {
    await buildSignedCookies('video-1');
    await buildSignedCookies('video-2');
    await buildSignedCookies('video-3');

    expect(mockSsmSend).toHaveBeenCalledTimes(1);
    expect(mockGetSignedCookies).toHaveBeenCalledTimes(3);
    expect(mockGetSignedCookies.mock.calls[2]![0].url).toBe(
      'https://demos.example.org/media/video-3/*',
    );
  });

  it('rejects and does not cache when the parameter is empty', async () => {
    mockSsmSend.mockResolvedValue({ Parameter: { Value: '' } });

    await expect(buildSignedCookies('video-1')).rejects.toThrow(
      'the CloudFront signing key parameter is empty',
    );

    // the failed lookup must not poison the cache for the next request
    mockSsmSend.mockResolvedValue({ Parameter: { Value: 'recovered-key' } });
    await expect(buildSignedCookies('video-1')).resolves.toHaveLength(3);
    expect(mockSsmSend).toHaveBeenCalledTimes(2);
  });

  it('rejects and retries when SSM itself fails', async () => {
    mockSsmSend.mockRejectedValueOnce(new Error('AccessDenied'));

    await expect(buildSignedCookies('video-1')).rejects.toThrow('AccessDenied');

    await expect(buildSignedCookies('video-1')).resolves.toHaveLength(3);
    expect(mockSsmSend).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight lookup between concurrent callers', async () => {
    const [a, b] = await Promise.all([
      buildSignedCookies('video-1'),
      buildSignedCookies('video-2'),
    ]);

    expect(mockSsmSend).toHaveBeenCalledTimes(1);
    expect(a).toHaveLength(3);
    expect(b).toHaveLength(3);
  });
});

describe('the studio sources', () => {
  // the editor plays projects/{id}/assets/..., which is a different CloudFront
  // behaviour from the rendered media, so it needs its own signed prefix
  it('signs the projects prefix for the video it was asked about', async () => {
    await buildSignedCookies('video-1', 'projects');

    const { url, policy } = mockGetSignedCookies.mock.calls[0]![0];
    expect(url).toContain('/projects/video-1/*');
    expect(JSON.parse(policy as string).Statement[0].Resource).toContain(
      '/projects/video-1/*',
    );
  });

  it('still defaults to the rendered media', async () => {
    await buildSignedCookies('video-1');

    expect(mockGetSignedCookies.mock.calls[0]![0].url).toContain(
      '/media/video-1/*',
    );
  });
});
