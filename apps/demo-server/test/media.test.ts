process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import express from 'express';
import { Readable } from 'stream';
import supertest from 'supertest';
import { appFactory } from '../src/app';
import { isLocal } from '../src/config';
import { mediaRouter } from '../src/routes/media';
import { getObject } from '../src/storage';
/* eslint-enable import/first */

jest.mock('../src/storage', () => ({
  ...jest.requireActual('../src/storage'),
  getObject: jest.fn(),
}));

jest.mock('../src/config', () => ({
  ...jest.requireActual('../src/config'),
  isLocal: jest.fn(() => true),
}));

const mockGetObject = getObject as jest.MockedFunction<typeof getObject>;
const mockIsLocal = isLocal as jest.MockedFunction<typeof isLocal>;

// mounted the same way app.ts mounts it, without the api auth stack in the way
const standalone = () => {
  const app = express();
  app.use('/media', mediaRouter());
  return supertest(app);
};

beforeEach(() => {
  mockGetObject.mockReset();
  mockIsLocal.mockReturnValue(true);
});

describe('GET /media/*', () => {
  it('streams the object and advertises byte ranges', async () => {
    mockGetObject.mockResolvedValue({
      body: Readable.from(['#EXTM3U']),
      contentLength: 7,
      contentType: 'application/vnd.apple.mpegurl',
    });

    const response = await standalone().get('/media/video-1/index.m3u8');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe(
      'application/vnd.apple.mpegurl',
    );
    expect(response.headers['accept-ranges']).toBe('bytes');
    expect(response.headers['content-length']).toBe('7');
    expect(response.text).toBe('#EXTM3U');
  });

  it('prefixes the request path with the media folder', async () => {
    mockGetObject.mockResolvedValue({ body: Readable.from([]) });

    await standalone().get('/media/video-1/segment-0.ts');

    expect(mockGetObject).toHaveBeenCalledWith(
      'media/video-1/segment-0.ts',
      undefined,
    );
  });

  it('decodes a percent-encoded path', async () => {
    mockGetObject.mockResolvedValue({ body: Readable.from([]) });

    await standalone().get('/media/video-1/my%20clip.ts');

    expect(mockGetObject).toHaveBeenCalledWith(
      'media/video-1/my clip.ts',
      undefined,
    );
  });

  it('forwards the Range header and answers 206 with Content-Range', async () => {
    mockGetObject.mockResolvedValue({
      body: Readable.from(['abcde']),
      contentLength: 5,
      contentRange: 'bytes 0-4/1000',
      contentType: 'video/mp2t',
    });

    const response = await standalone()
      .get('/media/video-1/segment-0.ts')
      .set('Range', 'bytes=0-4');

    expect(mockGetObject).toHaveBeenCalledWith(
      'media/video-1/segment-0.ts',
      'bytes=0-4',
    );
    expect(response.status).toBe(206);
    expect(response.headers['content-range']).toBe('bytes 0-4/1000');
  });

  it('omits the content headers the object did not carry', async () => {
    mockGetObject.mockResolvedValue({ body: Readable.from(['x']) });

    const response = await standalone().get('/media/video-1/index.m3u8');

    expect(response.status).toBe(200);
    expect(response.headers['content-range']).toBeUndefined();
    expect(response.headers['accept-ranges']).toBe('bytes');
  });

  it('answers 404 when the object is missing', async () => {
    mockGetObject.mockRejectedValue(new Error('NoSuchKey'));

    const response = await standalone().get('/media/video-1/missing.ts');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
  });
});

describe('media mounting', () => {
  it('is served by the app when running locally', async () => {
    mockIsLocal.mockReturnValue(true);
    mockGetObject.mockResolvedValue({ body: Readable.from(['#EXTM3U']) });

    const response = await supertest(appFactory()).get(
      '/media/video-1/index.m3u8',
    );

    expect(response.status).toBe(200);
    expect(mockGetObject).toHaveBeenCalled();
  });

  it('is absent when deployed, where CloudFront serves media instead', async () => {
    mockIsLocal.mockReturnValue(false);

    const response = await supertest(appFactory()).get(
      '/media/video-1/index.m3u8',
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not Found' });
    expect(mockGetObject).not.toHaveBeenCalled();
  });
});
