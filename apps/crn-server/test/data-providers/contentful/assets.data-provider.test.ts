import { Environment, Asset } from '@asap-hub/contentful';
import {
  AssetCreateDataObject,
  AssetDataProvider,
} from '../../../src/data-providers/types';
import { AssetContentfulDataProvider } from '../../../src/data-providers/contentful/asset.data-provider';
import { getContentfulEnvironmentMock } from '../../mocks/contentful-rest-client.mock';

describe('Assets data provider', () => {
  const environmentMock = getContentfulEnvironmentMock();
  const contentfulRestClientMock: () => Promise<Environment> = () =>
    Promise.resolve(environmentMock);

  const assetsDataProvider: AssetDataProvider = new AssetContentfulDataProvider(
    contentfulRestClientMock,
  );

  const processMock = jest.fn();
  const publishMock = jest.fn();

  beforeEach(jest.resetAllMocks);
  beforeEach(() => {
    environmentMock.createAssetFromFiles.mockResolvedValueOnce({
      processForAllLocales: processMock,
      sys: {
        id: '123',
      },
      fields: {
        file: {
          'en-US': {
            fileName: 'abc.jpeg',
          },
        },
      },
    } as unknown as Asset);
    processMock.mockResolvedValueOnce({
      publish: publishMock,
      fields: {
        file: {
          'en-US': {
            url: 'https://test-url',
            fileName: 'abc.jpeg',
          },
        },
      },
    } as unknown as Asset);
  });

  describe('Fetch', () => {
    test('not implemented', async () => {
      await expect(assetsDataProvider.fetch(null)).rejects.toThrow();
    });
  });

  describe('Fetch by ID', () => {
    test('not implemented', async () => {
      await expect(assetsDataProvider.fetchById('123')).rejects.toThrow();
    });
  });

  describe('Create', () => {
    test('uploads, processes and publishes an asset', async () => {
      await assetsDataProvider.create({
        id: 'abc',
        title: 'test title',
        description: 'test description',
        content: Buffer.from('file buffer'),
        contentType: 'image/jpeg',
      });
      expect(environmentMock.createAssetFromFiles).toHaveBeenCalledWith({
        fields: {
          title: { 'en-US': 'test title' },
          description: { 'en-US': 'test description' },
          file: {
            'en-US': {
              contentType: 'image/jpeg',
              fileName: 'abc.jpeg',
              file: Buffer.from('file buffer'),
            },
          },
        },
      });
      expect(processMock).toHaveBeenCalled();
      expect(publishMock).toHaveBeenCalled();
    });

    test('uses custom filename if present', async () => {
      await assetsDataProvider.create({
        id: 'abc',
        filename: 'other-filename.pdf',
        title: 'test title',
        description: 'test description',
        content: Buffer.from('file buffer'),
        contentType: 'image/jpeg',
      });
      expect(environmentMock.createAssetFromFiles).toHaveBeenCalledWith({
        fields: {
          title: { 'en-US': 'test title' },
          description: { 'en-US': 'test description' },
          file: {
            'en-US': {
              contentType: 'image/jpeg',
              fileName: 'other-filename.pdf',
              file: Buffer.from('file buffer'),
            },
          },
        },
      });
      expect(processMock).toHaveBeenCalled();
      expect(publishMock).toHaveBeenCalled();
    });

    test('does not publish the asset if publish option is set to false', async () => {
      await assetsDataProvider.create({
        id: 'abc',
        title: 'test title',
        description: 'test description',
        content: Buffer.from('file buffer'),
        contentType: 'image/jpeg',
        publish: false,
      });
      expect(environmentMock.createAssetFromFiles).toHaveBeenCalled();
      expect(processMock).toHaveBeenCalled();
      expect(publishMock).not.toHaveBeenCalled();
    });

    test('returns the asset id, url and filename', async () => {
      const asset = await assetsDataProvider.create({
        id: 'abc',
        title: 'test title',
        description: 'test description',
        content: Buffer.from('file buffer'),
        contentType: 'image/jpeg',
      });
      expect(asset).toEqual({
        id: '123',
        url: 'https://test-url',
        filename: 'abc.jpeg',
      });
    });

    test('should default to input filename and empty url if locale not present', async () => {
      processMock.mockReset();
      processMock.mockResolvedValueOnce({
        publish: publishMock,
        fields: { file: {} },
      } as unknown as Asset);
      environmentMock.createAssetFromFiles.mockReset();
      environmentMock.createAssetFromFiles.mockResolvedValueOnce({
        processForAllLocales: processMock,
        sys: {
          id: '123',
        },
        fields: {
          file: {},
        },
      } as unknown as Asset);

      const asset = await assetsDataProvider.create({
        id: '123',
        filename: 'other-filename.pdf',
        title: 'test title',
        description: 'test description',
        content: Buffer.from('file buffer'),
        contentType: 'application/pdf',
      });

      expect(asset).toEqual({
        id: '123',
        url: '',
        filename: 'other-filename.pdf',
      });
    });
  });

  describe('Create from URL', () => {
    const createAssetMock = environmentMock.createAsset;
    const processMock = jest.fn();
    const publishMock = jest.fn();

    beforeEach(() => {
      createAssetMock.mockResolvedValue({
        sys: { id: 'asset-url-id' },
        fields: {
          file: {
            'en-US': {
              fileName: 'from-url.pdf',
            },
          },
        },
        processForAllLocales: processMock,
      } as unknown as Asset);

      processMock.mockResolvedValue({
        publish: publishMock,
        fields: {
          file: {
            'en-US': {
              fileName: 'from-url.pdf',
              url: 'https://cdn.contentful.com/assets/from-url.pdf',
            },
          },
        },
      } as unknown as Asset);
    });

    test('uploads, processes and publishes an asset from URL', async () => {
      const asset = await assetsDataProvider.createFromUrl({
        id: '',
        url: 'https://example.com/from-url.pdf',
        filename: 'from-url.pdf',
        fileType: 'application/pdf',
      } as AssetCreateDataObject & { fileType?: string; publish?: boolean });

      expect(createAssetMock).toHaveBeenCalledWith({
        fields: {
          title: { 'en-US': 'from-url.pdf' },
          description: { 'en-US': 'application/pdf' },
          file: {
            'en-US': {
              contentType: 'application/pdf',
              fileName: 'from-url.pdf',
              upload: 'https://example.com/from-url.pdf',
            },
          },
        },
      });

      expect(processMock).toHaveBeenCalled();
      expect(publishMock).toHaveBeenCalled();
      expect(asset).toEqual({
        id: 'asset-url-id',
        filename: 'from-url.pdf',
        url: 'https://cdn.contentful.com/assets/from-url.pdf',
      });
    });

    test('does not publish asset if publish is false', async () => {
      const asset = await assetsDataProvider.createFromUrl({
        id: '',
        url: 'https://example.com/no-publish.pdf',
        filename: 'no-publish.pdf',
        fileType: 'application/pdf',
        publish: false,
      } as unknown as AssetCreateDataObject & {
        fileType?: string;
        publish?: boolean;
      });

      expect(processMock).toHaveBeenCalled();
      expect(publishMock).not.toHaveBeenCalled();
      expect(asset.filename).toBe('from-url.pdf'); // matches mock above
    });

    test('defaults to filename and empty url if file locale missing', async () => {
      createAssetMock.mockResolvedValueOnce({
        sys: { id: 'no-locale-id' },
        fields: {
          file: {}, // no 'en-US'
        },
        processForAllLocales: processMock,
      } as unknown as Asset);
      processMock.mockResolvedValueOnce({
        publish: publishMock,
        fields: { file: {} },
      } as unknown as Asset);

      const asset = await assetsDataProvider.createFromUrl({
        id: '',
        url: 'https://example.com/fallback.pdf',
        filename: 'fallback.pdf',
        fileType: 'application/pdf',
      } as AssetCreateDataObject & { fileType?: string; publish?: boolean });

      expect(asset).toEqual({
        id: 'no-locale-id',
        filename: 'fallback.pdf',
        url: '',
      });
    });

    test('throws generic error if asset creation fails', async () => {
      createAssetMock.mockRejectedValueOnce(new Error('Boom 💥'));

      await expect(
        assetsDataProvider.createFromUrl({
          url: 'https://example.com/error.pdf',
          filename: 'error.pdf',
          fileType: 'application/pdf',
        } as AssetCreateDataObject & { fileType?: string; publish?: boolean }),
      ).rejects.toThrow('Failed to create asset from URL');
    });
  });
});
