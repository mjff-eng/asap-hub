import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { exportEntity, PAGE_SIZE } from '../../scripts/export-entity';
import { getEventResponse } from '../fixtures/events.fixtures';

const mockFetch = jest.fn();

jest.mock('../../src/controllers/event.controller', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ fetch: mockFetch })),
}));

const getEvents = (count: number, offset = 0) =>
  Array.from({ length: count }, (_, index) => ({
    ...getEventResponse(true),
    id: `event-${offset + index}`,
  }));

describe('exportEntity', () => {
  let filename: string;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'export-entity-'));
    filename = path.join(dir, 'event.json');
    mockFetch.mockReset();
    mockFetch.mockRejectedValue(new Error('Fetched past the last page'));
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    await fs.rm(path.dirname(filename), { recursive: true, force: true });
  });

  const readExport = async () =>
    JSON.parse(await fs.readFile(filename, 'utf8')) as { objectID: string }[];

  test('Should stop at the end of total when the data provider skips items', async () => {
    mockFetch
      .mockResolvedValueOnce({
        total: PAGE_SIZE + 2,
        items: getEvents(PAGE_SIZE),
      })
      .mockResolvedValueOnce({ total: PAGE_SIZE + 2, items: [] });

    await exportEntity('event', filename);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenLastCalledWith({
      take: PAGE_SIZE,
      skip: PAGE_SIZE,
    });
    expect(await readExport()).toHaveLength(PAGE_SIZE);
  });

  test('Should write valid JSON when the first page is entirely skipped', async () => {
    mockFetch
      .mockResolvedValueOnce({ total: PAGE_SIZE + 2, items: [] })
      .mockResolvedValueOnce({
        total: PAGE_SIZE + 2,
        items: getEvents(2, PAGE_SIZE),
      });

    await exportEntity('event', filename);

    expect((await readExport()).map(({ objectID }) => objectID)).toEqual([
      `event-${PAGE_SIZE}`,
      `event-${PAGE_SIZE + 1}`,
    ]);
  });
});
