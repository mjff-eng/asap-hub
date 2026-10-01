import { z } from 'zod';
import { currentSchemaVersion, Timeline, timelineSchema } from './schema';

export const defaultCanvas = { width: 1920, height: 1080, fps: 30 } as const;

export const createEmptyTimeline = (): Timeline => ({
  schemaVersion: currentSchemaVersion,
  canvas: { ...defaultCanvas },
  clips: [],
  banners: [],
  narration: [],
  zooms: [],
  cursor: [],
  chapters: [],
});

export class TimelineFormatError extends Error {
  constructor(
    message: string,
    readonly issues?: z.ZodIssue[],
  ) {
    super(message);
    this.name = 'TimelineFormatError';
  }
}

const readSchemaVersion = (value: unknown): number => {
  if (typeof value !== 'object' || value === null) {
    throw new TimelineFormatError('timeline must be an object');
  }
  if (!('schemaVersion' in value) || typeof value.schemaVersion !== 'number') {
    throw new TimelineFormatError('timeline is missing schemaVersion');
  }
  return value.schemaVersion;
};

const withoutSurface = (layer: unknown): unknown => {
  if (typeof layer !== 'object' || layer === null || !('surface' in layer)) {
    return layer;
  }
  return Object.fromEntries(
    Object.entries(layer as Record<string, unknown>).filter(
      ([key]) => key !== 'surface',
    ),
  );
};

// each future version adds a step here; a document only ever moves forward
const migrations: Record<number, (value: unknown) => unknown> = {
  // Version 1 let every applied capture stamp the cursor layer with whichever
  // surface that apply resolved, which for a document holding several takes was
  // the newest take's and wrong for all the others. From version 2 only the take
  // itself writes it, and a value left by version 1 cannot be told from a good
  // one, so it goes: the clip then reads through the live recorder again, which
  // is the only way a wrongly mapped one can be put right.
  1: (value) => {
    const { cursor } = value as { cursor?: unknown };
    return {
      ...(value as Record<string, unknown>),
      schemaVersion: 2,
      ...(Array.isArray(cursor) ? { cursor: cursor.map(withoutSurface) } : {}),
    };
  },
};

export const migrateTimeline = (value: unknown): unknown => {
  let migrated = value;
  let version = readSchemaVersion(migrated);

  while (version < currentSchemaVersion) {
    const migration = migrations[version];
    if (!migration) {
      throw new TimelineFormatError(
        `no migration from schema version ${version}`,
      );
    }
    migrated = migration(migrated);
    const migratedVersion = readSchemaVersion(migrated);
    // a step that forgets to stamp the new version would loop here forever
    if (migratedVersion <= version) {
      throw new TimelineFormatError(
        `migration from schema version ${version} did not advance it`,
      );
    }
    version = migratedVersion;
  }

  if (version > currentSchemaVersion) {
    throw new TimelineFormatError(
      `timeline schema version ${version} is newer than this build supports`,
    );
  }

  return migrated;
};

const maxReportedIssues = 5;

const describeIssues = (issues: z.ZodIssue[]): string =>
  issues
    .slice(0, maxReportedIssues)
    .map((issue) => `${issue.path.join('.') || 'timeline'}: ${issue.message}`)
    .join('; ');

export const parseTimeline = (value: unknown): Timeline => {
  const result = timelineSchema.safeParse(migrateTimeline(value));
  if (!result.success) {
    throw new TimelineFormatError(
      `timeline failed validation (${describeIssues(result.error.issues)})`,
      result.error.issues,
    );
  }
  return result.data;
};

export const serialiseTimeline = (timeline: Timeline): string =>
  JSON.stringify(timeline);
