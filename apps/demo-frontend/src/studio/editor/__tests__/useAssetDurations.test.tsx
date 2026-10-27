import { act, renderHook } from '@testing-library/react';
import { ProjectAsset } from '../../../api/types';
import { useAssetDurations } from '../useAssetDurations';

const asset = (overrides: Partial<ProjectAsset> = {}): ProjectAsset => ({
  assetId: 'asset-a',
  kind: 'video',
  state: 'ready',
  mimeType: 'video/mp4',
  label: 'Sprint demo',
  url: 'blob:a',
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
  ...overrides,
});

const urlOf = (item: ProjectAsset) => item.url;

// jsdom never loads media, so each probe the hook starts is caught here and
// told by hand what the browser read from the file
let probes: HTMLVideoElement[] = [];

beforeEach(() => {
  probes = [];
  const create = document.createElement.bind(document);
  jest
    .spyOn(document, 'createElement')
    .mockImplementation((tag: string, options?: ElementCreationOptions) => {
      const element = create(tag, options);
      if (tag === 'video') {
        probes.push(element as HTMLVideoElement);
      }
      return element;
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const metadataLoads = async (probe: HTMLVideoElement, seconds: number) => {
  Object.defineProperty(probe, 'duration', {
    configurable: true,
    value: seconds,
  });
  await act(async () => {
    probe.dispatchEvent(new Event('loadedmetadata'));
  });
};

const fails = async (probe: HTMLVideoElement) => {
  await act(async () => {
    probe.dispatchEvent(new Event('error'));
  });
};

describe('useAssetDurations', () => {
  it('reads the length of a clip the ingest has not measured yet', async () => {
    const assets = [asset()];
    const { result } = renderHook(() => useAssetDurations(assets, urlOf));

    expect(probes).toHaveLength(1);
    expect(probes[0]?.getAttribute('src')).toBe('blob:a');
    expect(probes[0]?.preload).toBe('metadata');

    await metadataLoads(probes[0] as HTMLVideoElement, 12.3456);

    expect(result.current).toEqual({ 'asset-a': 12346 });
  });

  it('lets the probe go once it has its answer', async () => {
    const assets = [asset()];
    renderHook(() => useAssetDurations(assets, urlOf));
    const probe = probes[0] as HTMLVideoElement;

    await metadataLoads(probe, 4);

    expect(probe.getAttribute('src')).toBe('');
    expect(probe.onloadedmetadata).toBeNull();
    expect(probe.onerror).toBeNull();
  });

  it('leaves a clip alone once the ingest has written its length', () => {
    const assets = [asset({ durationMs: 8000 })];
    const { result } = renderHook(() => useAssetDurations(assets, urlOf));

    expect(probes).toHaveLength(0);
    expect(result.current).toEqual({});
  });

  it('waits for a clip that has nowhere to be read from yet', () => {
    const { result, rerender } = renderHook(
      ({ assets }) => useAssetDurations(assets, urlOf),
      { initialProps: { assets: [asset({ url: undefined })] } },
    );
    expect(probes).toHaveLength(0);

    rerender({ assets: [asset()] });

    expect(probes).toHaveLength(1);
    expect(result.current).toEqual({});
  });

  it('records nothing when the file reports no usable length', async () => {
    const assets = [
      asset({ assetId: 'stream', url: 'blob:stream' }),
      asset({ assetId: 'empty', url: 'blob:empty' }),
    ];
    const { result } = renderHook(() => useAssetDurations(assets, urlOf));

    await metadataLoads(probes[0] as HTMLVideoElement, Infinity);
    await metadataLoads(probes[1] as HTMLVideoElement, 0);

    expect(result.current).toEqual({});
  });

  it('records nothing when the browser cannot open the file', async () => {
    const assets = [asset()];
    const { result } = renderHook(() => useAssetDurations(assets, urlOf));

    await fails(probes[0] as HTMLVideoElement);

    expect(result.current).toEqual({});
  });

  it('probes each clip once, however often the list is handed back', async () => {
    const { result, rerender } = renderHook(
      ({ assets }) => useAssetDurations(assets, urlOf),
      { initialProps: { assets: [asset()] } },
    );
    await fails(probes[0] as HTMLVideoElement);

    rerender({ assets: [asset(), asset({ assetId: 'asset-b' })] });

    expect(probes).toHaveLength(2);
    expect(probes[1]?.getAttribute('src')).toBe('blob:a');
    await metadataLoads(probes[1] as HTMLVideoElement, 3);
    expect(result.current).toEqual({ 'asset-b': 3000 });
  });
});
