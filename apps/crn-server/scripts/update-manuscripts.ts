import {
  type Entry,
  type Environment,
  patchAndPublish,
} from '@asap-hub/contentful';
import {
  cell,
  col,
  getContentfulEnvironment,
  getErrorMessage,
  isEmptyRow,
  NON_ARCHIVED_ENTRY_QUERY,
  readCsv,
  validateRequiredColumns,
  writeCsv,
} from './import-utils';
import {
  getLifecycleCode,
  getTypeCode,
} from '../src/data-providers/contentful/manuscript.data-provider';

const REQUIRED_MANUSCRIPT_IMPORT_COLUMNS = [
  'Title',
  'Manuscript ID',
  'Preprint Date',
  'Publication Date',
  'URL',
  'Short Description',
  'Lay Impact Statement',
] as const;

const IMPORT_REPORT_HEADERS: string[] = [
  ...REQUIRED_MANUSCRIPT_IMPORT_COLUMNS,
  'Error',
];

const LAY_IMPACT_STATEMENT_MAX_LENGTH = 100;
const SHORT_DESCRIPTION_MAX_LENGTH = 250;

// Same pattern Contentful enforces on manuscriptVersions.url / manuscripts.url.
const URL_PATTERN =
  /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Checks both the zero-padded ISO shape and that the date is a real calendar date. */
const isValidIsoDate = (value: string): boolean => {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/**
 * Updates existing manuscripts and manuscript versions in Contentful.
 * CSV columns: Title, Manuscript ID, Preprint Date, Publication Date,
 * URL, Short Description, Lay Impact Statement. Every column is required on
 * every row except Preprint Date and Publication Date; a row missing any
 * other column is skipped and logged.
 *
 * A manuscript is looked up by its exact Title. The specific version to
 * update is found by matching the last three dash-separated segments of the
 * Manuscript ID (e.g. "org-P-1" in "DA2-000464-056-org-P-1") against a
 * suffix computed the same way `getManuscriptVersionUID` does, from each of
 * the manuscript's existing versions' type/lifecycle/count. A row whose
 * suffix doesn't match any existing version is skipped and logged.
 *
 * Before writing to a version, its URL, Lay Impact Statement and Short
 * Description are checked against the same constraints Contentful enforces and
 * Preprint Date / Publication Date (when present) are checked for
 * YYYY-MM-DD format. If any fails, the row is skipped and logged.
 *
 * A manuscript can have several rows (one per version). Per manuscript:
 *  - URL and Short Description are written to the matched version's URL and
 *    Short Description fields.
 *  - Lay Impact Statement, Preprint Date and Publication Date are
 *    manuscript-level fields, so when rows disagree a per-field rule picks
 *    which one wins (a warning is logged either way): Lay Impact Statement
 *    takes the value from the row with the highest version count, while
 *    Preprint Date and Publication Date each take the earliest date across
 *    the manuscript's rows.
 *  - The manuscript URL is set separately from the version URLs: it
 *    is taken from whichever of the manuscript's versions has the highest
 *    count *and* a URL, considering all of the manuscript's versions in the
 *    CMS (including ones not present in this CSV), not just the versions
 *    touched by this import.
 *
 * Two report CSVs are written next to the input file:
 *  - `<input>-report.csv`: the input columns plus an Error column with any
 *    warnings/skip reasons for that row.
 *  - `<input>-overwritten-fields.csv`: one row per manuscript that had a
 *    manuscript field already set in the CMS to a different value,
 *    with the current and updated value side by side per field - kept
 *    separate from the Error report since this isn't a problem, just a diff
 *    worth reviewing.
 *
 * Usage (env vars loaded from .env file):
 *   yarn update:manuscripts <csv-path>
 */

type CsvRow = {
  title: string;
  manuscriptId: string;
  preprintDate: string;
  publicationDate: string;
  url: string;
  shortDescription: string;
  layImpactStatement: string;
  errors: string[];
};

type VersionInfo = {
  id: string;
  entry: Entry;
  count: number;
  url: string;
  suffix: string;
};

type Counters = {
  versionsUpdated: number;
  manuscriptsUpdated: number;
  manuscriptNotFound: number;
  manuscriptAmbiguous: number;
  versionNotFound: number;
  malformedId: number;
  missingRequiredField: number;
  invalidFieldValue: number;
  failed: number;
  overwritten: number;
};

const createCounters = (): Counters => ({
  versionsUpdated: 0,
  manuscriptsUpdated: 0,
  manuscriptNotFound: 0,
  manuscriptAmbiguous: 0,
  versionNotFound: 0,
  malformedId: 0,
  missingRequiredField: 0,
  invalidFieldValue: 0,
  failed: 0,
  overwritten: 0,
});

const addRowError = (row: CsvRow, message: string): void => {
  row.errors.push(message);
};

// Every column is required except Preprint Date and Publication Date.
const REQUIRED_ROW_FIELDS: Array<{ field: keyof CsvRow; label: string }> = [
  { field: 'title', label: 'Title' },
  { field: 'manuscriptId', label: 'Manuscript ID' },
  { field: 'url', label: 'URL' },
  { field: 'shortDescription', label: 'Short Description' },
  { field: 'layImpactStatement', label: 'Lay Impact Statement' },
];

const getMissingFieldLabels = (row: CsvRow): string[] =>
  REQUIRED_ROW_FIELDS.filter(({ field }) => !row[field]).map(
    ({ label }) => label,
  );

/**
 * Checks the fields written to a version (URL, Lay Impact Statement, Short
 * Description) against the same constraints Contentful enforces
 */
const getInvalidFieldMessages = (row: CsvRow): string[] => {
  const messages: string[] = [];
  if (!URL_PATTERN.test(row.url)) {
    messages.push(`URL "${row.url}" is not a valid URL`);
  }
  if (row.layImpactStatement.length > LAY_IMPACT_STATEMENT_MAX_LENGTH) {
    messages.push(
      `Lay Impact Statement is ${row.layImpactStatement.length} characters, over the ${LAY_IMPACT_STATEMENT_MAX_LENGTH} limit`,
    );
  }
  if (row.shortDescription.length > SHORT_DESCRIPTION_MAX_LENGTH) {
    messages.push(
      `Short Description is ${row.shortDescription.length} characters, over the ${SHORT_DESCRIPTION_MAX_LENGTH} limit`,
    );
  }
  if (row.preprintDate && !isValidIsoDate(row.preprintDate)) {
    messages.push(
      `Preprint Date "${row.preprintDate}" is not a valid YYYY-MM-DD date`,
    );
  }
  if (row.publicationDate && !isValidIsoDate(row.publicationDate)) {
    messages.push(
      `Publication Date "${row.publicationDate}" is not a valid YYYY-MM-DD date`,
    );
  }
  return messages;
};

// Unlike cell(), this doesn't trim. Titles are matched exactly against the
// CMS as some CMS titles have a leading/trailing space which are included in the csv title
const rawCell = (row: string[], index: number): string => row[index] || '';

/**
 * Builds the same type-lifecycle-count suffix as `getManuscriptVersionUID`,
 * from a CMS version's actual fields for comparison with suffix of Manuscript ID in csv.
 */
const getVersionSuffix = (version: {
  type: string;
  lifecycle: string;
  count: number;
}): string =>
  `${getTypeCode(version.type)}-${getLifecycleCode(version.lifecycle)}-${
    version.count
  }`;

/** Extracts the last three dash-separated segments of a Manuscript ID. */
const parseVersionSuffix = (manuscriptId: string): string | null => {
  const segments = manuscriptId.split('-').filter(Boolean);
  if (segments.length < 3) {
    return null;
  }
  return segments.slice(-3).join('-');
};

/**
 * Parses the version count segment of a Manuscript ID, for ordering the
 * report only. Malformed/unparseable IDs sort last within their manuscript group.
 */
const getVersionCount = (manuscriptId: string): number => {
  const segments = manuscriptId.split('-').filter(Boolean);
  const count = Number(segments[segments.length - 1]);
  return Number.isNaN(count) ? Number.POSITIVE_INFINITY : count;
};

/** Contentful stores Date fields as a full datetime - compare by date only. */
const normalizeDateValue = (value: string): string => value.slice(0, 10);

const findManuscriptsByTitle = async (
  env: Environment,
  title: string,
): Promise<Entry[]> => {
  const entries = await env.getEntries({
    ...NON_ARCHIVED_ENTRY_QUERY,
    content_type: 'manuscripts',
    'fields.title': title,
    limit: 10,
  });
  return entries.items;
};

const getManuscriptVersions = async (
  env: Environment,
  manuscriptEntry: Entry,
): Promise<VersionInfo[]> => {
  const versionLinks = (manuscriptEntry.fields.versions?.['en-US'] ||
    []) as Array<{
    sys: { id: string };
  }>;

  const versions: VersionInfo[] = [];
  for (const link of versionLinks) {
    const entry = await env.getEntry(link.sys.id);
    const type = (entry.fields.type?.['en-US'] as string) || '';
    const lifecycle = (entry.fields.lifecycle?.['en-US'] as string) || '';
    const count = (entry.fields.count?.['en-US'] as number) || 0;
    const url = (entry.fields.url?.['en-US'] as string) || '';
    versions.push({
      id: entry.sys.id,
      entry,
      count,
      url,
      suffix: getVersionSuffix({ type, lifecycle, count }),
    });
  }
  return versions;
};

/** Parses non-empty CSV rows into CsvRow objects, flags any missing required field, and groups them by title. */
const groupRowsByManuscriptTitle = (
  rows: string[][],
  headers: string[],
): {
  totalRows: number;
  versionRowsByManuscriptTitle: Map<string, CsvRow[]>;
} => {
  const columns = {
    title: col(headers, 'Title'),
    manuscriptId: col(headers, 'Manuscript ID'),
    preprintDate: col(headers, 'Preprint Date'),
    publicationDate: col(headers, 'Publication Date'),
    url: col(headers, 'URL'),
    shortDescription: col(headers, 'Short Description'),
    layImpactStatement: col(headers, 'Lay Impact Statement'),
  };

  const versionRowsByManuscriptTitle = new Map<string, CsvRow[]>();
  let totalRows = 0;

  rows.forEach((row) => {
    if (isEmptyRow(row)) {
      return;
    }
    const parsedRow: CsvRow = {
      title: rawCell(row, columns.title),
      manuscriptId: cell(row, columns.manuscriptId),
      preprintDate: cell(row, columns.preprintDate),
      publicationDate: cell(row, columns.publicationDate),
      url: cell(row, columns.url),
      shortDescription: cell(row, columns.shortDescription),
      layImpactStatement: cell(row, columns.layImpactStatement),
      errors: [],
    };

    const missingFields = getMissingFieldLabels(parsedRow);
    if (missingFields.length > 0) {
      addRowError(
        parsedRow,
        `Missing required value(s): ${missingFields.join(', ')}`,
      );
    }

    totalRows += 1;
    const group = versionRowsByManuscriptTitle.get(parsedRow.title);
    if (group) {
      group.push(parsedRow);
    } else {
      versionRowsByManuscriptTitle.set(parsedRow.title, [parsedRow]);
    }
  });

  return { totalRows, versionRowsByManuscriptTitle };
};

/** Finds the manuscript by title, skipping (and logging on every row) when it's missing or ambiguous. */
const resolveManuscriptEntry = async (
  env: Environment,
  title: string,
  manuscriptGroup: CsvRow[],
  counters: Counters,
): Promise<Entry | null> => {
  const matches = await findManuscriptsByTitle(env, title);

  if (matches.length === 0) {
    console.log(`  Skipped (manuscript not found): "${title}"`);
    manuscriptGroup.forEach((row) =>
      addRowError(row, 'Manuscript not found in CMS for this title'),
    );
    counters.manuscriptNotFound += manuscriptGroup.length;
    return null;
  }

  if (matches.length > 1) {
    console.log(`  Skipped (multiple manuscripts found for title): "${title}"`);
    manuscriptGroup.forEach((row) =>
      addRowError(
        row,
        'Multiple manuscripts found in CMS for this title - skipped',
      ),
    );
    counters.manuscriptAmbiguous += manuscriptGroup.length;
    return null;
  }

  return matches[0] as Entry;
};

/**
 * Matches each row to a version by suffix and writes its URL/Description.
 * Rows with a malformed Manuscript ID or no matching version are logged and skipped.
 */
const updateMatchedVersions = async (
  title: string,
  manuscriptGroup: CsvRow[],
  versions: VersionInfo[],
  counters: Counters,
  matchedRows: Array<{ row: CsvRow; version: VersionInfo }>,
): Promise<void> => {
  for (const row of manuscriptGroup) {
    const suffix = parseVersionSuffix(row.manuscriptId);
    if (!suffix) {
      console.log(`  Skipped (malformed Manuscript ID): "${title}"`);
      addRowError(row, 'Could not parse version suffix');
      counters.malformedId += 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    const version = versions.find((v) => v.suffix === suffix);
    if (!version) {
      console.log(`  Skipped (version not found): "${title}"`);
      addRowError(
        row,
        `No matching version found in CMS for suffix "${suffix}"`,
      );
      counters.versionNotFound += 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    const invalidFieldMessages = getInvalidFieldMessages(row);
    if (invalidFieldMessages.length > 0) {
      invalidFieldMessages.forEach((message) => addRowError(row, message));
      counters.invalidFieldValue += 1;
      // eslint-disable-next-line no-continue
      continue;
    }

    const updated = await patchAndPublish(version.entry, {
      url: row.url,
      shortDescription: row.shortDescription,
    });
    version.entry = updated;
    version.url = row.url;
    counters.versionsUpdated += 1;

    matchedRows.push({ row, version });
  }
};

/**
 * Gets the manuscript fields to update (URL, Lay Impact Statement,
 * Preprint/Publication Date) from the matched rows and the manuscript's full
 * version list, and records any that overwrite a different existing value.
 */
const getManuscriptFieldUpdates = (
  title: string,
  manuscriptEntry: Entry,
  versions: VersionInfo[],
  matchedRows: Array<{ row: CsvRow; version: VersionInfo }>,
  counters: Counters,
): {
  manuscriptFields: Record<string, unknown>;
  overwriteDiff: Record<string, string>;
} => {
  const manuscriptFields: Record<string, unknown> = {};
  const overwriteDiff: Record<string, string> = {};

  // checks and logs if a field on a manuscript has an existing value that is being overwritten
  const logIfOverwriting = (
    field: 'url' | 'layImpactStatement' | 'preprintDate' | 'publicationDate',
    newValue: string,
    isDate = false,
  ) => {
    const rawExisting =
      (manuscriptEntry.fields[field]?.['en-US'] as string) || '';
    const existingValue = isDate
      ? normalizeDateValue(rawExisting)
      : rawExisting;
    if (existingValue && existingValue !== newValue) {
      console.warn(
        `  Warning: Overwriting ${field} for "${title}": "${existingValue}" -> "${newValue}"`,
      );
      counters.overwritten += 1;
      overwriteDiff[`${field}Current`] = existingValue;
      overwriteDiff[`${field}Updated`] = newValue;
    }
  };

  const applyManuscriptFieldUpdate = (
    field: 'url' | 'layImpactStatement' | 'preprintDate' | 'publicationDate',
    newValue: string | undefined,
    isDate = false,
  ) => {
    if (!newValue) {
      return;
    }
    logIfOverwriting(field, newValue, isDate);
    manuscriptFields[field] = newValue;
  };

  const latestVersionWithUrl = [...versions]
    .filter((v) => v.url)
    .sort((a, b) => b.count - a.count)[0];

  // a manuscript's url should be the url in the latest version with a url
  applyManuscriptFieldUpdate('url', latestVersionWithUrl?.url);

  // client says to use the lay impact statement of the latest version in the sheet
  const [recentSheetVersion] = [...matchedRows].sort(
    (a, b) => b.version.count - a.version.count,
  );
  applyManuscriptFieldUpdate(
    'layImpactStatement',
    recentSheetVersion?.row.layImpactStatement,
  );

  const pickEarliestDate = (
    field: 'preprintDate' | 'publicationDate',
  ): string | undefined => {
    const candidates = matchedRows.filter((m) => m.row[field]);
    const distinctValues = new Set(candidates.map((c) => c.row[field]));
    if (distinctValues.size > 1) {
      const message = `Conflicting ${field} values: ${[...distinctValues].join(
        ', ',
      )} - using the earliest date`;
      console.warn(`  Warning: ${message} ("${title}")`);
      candidates.forEach((c) => addRowError(c.row, message));
    }
    const [earliest] = [...candidates].sort((a, b) =>
      a.row[field].localeCompare(b.row[field]),
    );
    return earliest?.row[field];
  };

  applyManuscriptFieldUpdate(
    'preprintDate',
    pickEarliestDate('preprintDate'),
    true,
  );
  applyManuscriptFieldUpdate(
    'publicationDate',
    pickEarliestDate('publicationDate'),
    true,
  );

  return { manuscriptFields, overwriteDiff };
};

const app = async () => {
  const csvPath = process.argv[2];
  if (!csvPath) {
    throw new Error('Usage: yarn update:manuscripts <csv-path>');
  }

  const env = await getContentfulEnvironment();
  const { rows, headers } = await readCsv(csvPath);

  validateRequiredColumns(headers, REQUIRED_MANUSCRIPT_IMPORT_COLUMNS);

  const { totalRows, versionRowsByManuscriptTitle } =
    groupRowsByManuscriptTitle(rows, headers);

  const counters = createCounters();
  let processedRowCount = 0;
  const overwrittenFieldsReportRows: Array<
    { title: string } & Record<string, string>
  > = [];

  const processManuscript = async (
    title: string,
    manuscriptGroup: CsvRow[],
  ) => {
    processedRowCount += manuscriptGroup.length;
    console.log(
      `[${processedRowCount}/${totalRows}] Processing ${manuscriptGroup.length} version(s) of manuscript with title "${title}".`,
    );

    // at this stage rows with errors are missing a required field
    const validRows = manuscriptGroup.filter((row) => row.errors.length === 0);
    counters.missingRequiredField += manuscriptGroup.length - validRows.length;
    if (validRows.length === 0) {
      return;
    }

    const matchedRows: Array<{ row: CsvRow; version: VersionInfo }> = [];
    let manuscriptFieldsResolved = false;
    try {
      const manuscriptEntry = await resolveManuscriptEntry(
        env,
        title,
        validRows,
        counters,
      );
      if (!manuscriptEntry) {
        return;
      }

      const versions = await getManuscriptVersions(env, manuscriptEntry);
      await updateMatchedVersions(
        title,
        validRows,
        versions,
        counters,
        matchedRows,
      );
      if (matchedRows.length === 0) {
        return;
      }

      const { manuscriptFields, overwriteDiff } = getManuscriptFieldUpdates(
        title,
        manuscriptEntry,
        versions,
        matchedRows,
        counters,
      );

      const hasOverwrite = Object.keys(overwriteDiff).length > 0;
      if (hasOverwrite) {
        overwrittenFieldsReportRows.push({ title, ...overwriteDiff });
      }

      if (Object.keys(manuscriptFields).length > 0) {
        await patchAndPublish(manuscriptEntry, manuscriptFields);
        counters.manuscriptsUpdated += 1;
      }
      manuscriptFieldsResolved = true;
    } catch (error: unknown) {
      counters.failed += 1;
      const message = `Failed: ${getErrorMessage(error)}`;
      console.error(`  ${message} ("${title}")`);
      // Rows already in matchedRows have had their version successfully patched
      // and published before the failure. If that happened before the
      // manuscript-level fields were resolved flag it.
      // Rows that already have an error keep the existing error message instead of
      // being overwritten.
      validRows.forEach((row) => {
        const alreadyMatched = matchedRows.some((m) => m.row === row);
        if (alreadyMatched) {
          if (!manuscriptFieldsResolved) {
            addRowError(
              row,
              `Version updated, but manuscript-level fields may not have been updated: ${getErrorMessage(
                error,
              )}`,
            );
          }
          return;
        }
        if (row.errors.length === 0) {
          addRowError(row, message);
        }
      });
    }
  };

  console.log(
    `\nImporting ${totalRows} rows across ${versionRowsByManuscriptTitle.size} manuscripts...\n`,
  );

  for (const [
    title,
    manuscriptGroup,
  ] of versionRowsByManuscriptTitle.entries()) {
    // eslint-disable-next-line no-await-in-loop
    await processManuscript(title, manuscriptGroup);
  }

  console.log(`\n--- Summary ---`);
  console.log(
    `Versions updated: ${counters.versionsUpdated}, Manuscripts updated: ${counters.manuscriptsUpdated}, Failed: ${counters.failed}`,
  );
  console.log(
    `Skipped - manuscript not found: ${counters.manuscriptNotFound}, ambiguous title: ${counters.manuscriptAmbiguous}, version not found: ${counters.versionNotFound}, malformed ID: ${counters.malformedId}, missing required field: ${counters.missingRequiredField}, invalid field value: ${counters.invalidFieldValue}`,
  );
  console.log(
    `Manuscript-level fields overwritten with a different value: ${counters.overwritten}`,
  );

  const reportPath = `${csvPath}-report.csv`;
  // sort each manuscript group by version count so the
  // report reads as versions 1, 2, 3... rather than the CSV's raw order.
  const orderedRows = [...versionRowsByManuscriptTitle.values()].flatMap(
    (manuscriptGroup) =>
      [...manuscriptGroup].sort(
        (a, b) =>
          getVersionCount(a.manuscriptId) - getVersionCount(b.manuscriptId),
      ),
  );
  const reportRows = orderedRows.map((row) => [
    row.title,
    row.manuscriptId,
    row.preprintDate,
    row.publicationDate,
    row.url,
    row.shortDescription,
    row.layImpactStatement,
    row.errors.join(' | '),
  ]);
  writeCsv(reportPath, IMPORT_REPORT_HEADERS, reportRows);
  console.log(`\nReport written to: ${reportPath}`);

  const overwrittenReportPath = `${csvPath}-overwritten-fields.csv`;
  const overwrittenHeaders = [
    'Title',
    'Preprint Date (Current)',
    'Preprint Date (Updated)',
    'Publication Date (Current)',
    'Publication Date (Updated)',
    'URL (Current)',
    'URL (Updated)',
    'Lay Impact Statement (Current)',
    'Lay Impact Statement (Updated)',
  ];
  const overwrittenRows = overwrittenFieldsReportRows.map((diff) => [
    diff.title,
    diff.preprintDateCurrent || '',
    diff.preprintDateUpdated || '',
    diff.publicationDateCurrent || '',
    diff.publicationDateUpdated || '',
    diff.urlCurrent || '',
    diff.urlUpdated || '',
    diff.layImpactStatementCurrent || '',
    diff.layImpactStatementUpdated || '',
  ]);
  writeCsv(overwrittenReportPath, overwrittenHeaders, overwrittenRows);
  console.log(`Overwritten-fields report written to: ${overwrittenReportPath}`);
};

if (require.main === module) {
  app().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
