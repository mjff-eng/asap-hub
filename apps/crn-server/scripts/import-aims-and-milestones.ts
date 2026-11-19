import {
  Entry,
  Environment,
  getLinkEntity,
  type Link,
} from '@asap-hub/contentful';
import { MilestoneStatus, milestoneStatuses } from '@asap-hub/model';
import path from 'path';
import {
  cell,
  col,
  getContentfulEnvironment,
  getErrorMessage,
  isEmptyRow,
  readCsv,
  validateRequiredColumns,
  writeCsv,
} from './import-utils';

const REQUIRED_AIMS_COLUMNS = [
  'Project ID',
  'Project Title',
  'Grant Type',
  'Aim Number',
  'Aim Description',
];

const REQUIRED_MILESTONES_COLUMNS = [
  'Project ID',
  'Project Title',
  'Grant Type',
  'Milestone Description',
  'Related Aim Number(s)',
  'Milestone Status',
];

const GRANT_TYPES = ['original', 'supplement'] as const;
type GrantBucket = (typeof GRANT_TYPES)[number];

type MilestoneImport = {
  description: string;
  status: MilestoneStatus;
};

type AimImport = {
  aimNumber: number;
  description: string;
  milestoneKeys: string[];
};

type ProjectImport = {
  projectId: string;
  title: string;
  aimsByGrantType: Record<GrantBucket, Record<number, AimImport>>;
  milestonesByGrantType: Record<GrantBucket, Record<string, MilestoneImport>>;
  entry?: Entry;
};

type CsvData = { headers: string[]; rows: string[][] };

type ImportStats = {
  aimsCreated: number;
  aimsUpdated: number;
  aimsUnchanged: number;
  milestonesCreated: number;
  milestonesReused: number;
  grantsUpdated: number;
  grantsUnchanged: number;
};

const createImportStats = (): ImportStats => ({
  aimsCreated: 0,
  aimsUpdated: 0,
  aimsUnchanged: 0,
  milestonesCreated: 0,
  milestonesReused: 0,
  grantsUpdated: 0,
  grantsUnchanged: 0,
});

const mergeImportStats = (...items: ImportStats[]): ImportStats =>
  items.reduce(
    (total, item) => ({
      aimsCreated: total.aimsCreated + item.aimsCreated,
      aimsUpdated: total.aimsUpdated + item.aimsUpdated,
      aimsUnchanged: total.aimsUnchanged + item.aimsUnchanged,
      milestonesCreated: total.milestonesCreated + item.milestonesCreated,
      milestonesReused: total.milestonesReused + item.milestonesReused,
      grantsUpdated: total.grantsUpdated + item.grantsUpdated,
      grantsUnchanged: total.grantsUnchanged + item.grantsUnchanged,
    }),
    createImportStats(),
  );

const LOCALE = 'en-US';
const BATCH_SIZE = 10;
const FETCH_PAGE_SIZE = 100;

const normalizeGrantType = (value: string): GrantBucket => {
  if (GRANT_TYPES.includes(value as GrantBucket)) {
    return value as GrantBucket;
  }
  if (value === 'Original Grant') return 'original';
  if (value === 'Supplement Grant') return 'supplement';
  throw new Error(`Unknown Grant Type: ${value}`);
};

const statusMap = {
  'Not Started': 'Pending',
  Active: 'In Progress',
  Completed: 'Complete',
  Pivoted: 'Terminated',
} as const;

const normalizeMilestoneStatus = (value: string): MilestoneStatus => {
  if (milestoneStatuses.includes(value as MilestoneStatus)) {
    return value as MilestoneStatus;
  }

  const normalized = statusMap[value as keyof typeof statusMap];
  if (normalized) {
    return normalized;
  }
  throw new Error(`Unknown Milestone Status: ${value}`);
};

type ImportErrorStage = 'validation' | 'resolve' | 'import';

type ImportError = {
  projectId: string;
  projectTitle: string;
  grantType: string;
  file: 'aims' | 'milestones' | '';
  row: number | '';
  stage: ImportErrorStage;
  error: string;
};

const ERRORS_CSV_HEADERS = [
  'Project ID',
  'Project Title',
  'Grant Type',
  'File',
  'Row',
  'Stage',
  'Error',
];

const importErrorToCsvRow = (error: ImportError): string[] => [
  error.projectId,
  error.projectTitle,
  error.grantType,
  error.file,
  String(error.row),
  error.stage,
  error.error,
];

const csvLineNumber = (rowIndex: number) => rowIndex + 2;

const projectKey = (projectId: string, title: string) =>
  `${projectId}\n${title}`;

const parseAimNumber = (value: string): number => {
  const aimNumber = Number(value);
  if (!Number.isInteger(aimNumber) || aimNumber < 1) {
    throw new Error(`Invalid Aim Number: "${value}"`);
  }
  return aimNumber;
};

/**
 * Builds the in-memory project model from the aims and milestones CSVs:
 * aims and milestones are grouped by project and grant type, and each aim
 * gets the descriptions of the milestones related to it.
 *
 * Projects are keyed by Project ID and title, as a Project ID can be shared by
 * several projects. A milestone row whose title matches no project in the aims
 * CSV is assigned to the project with that Project ID when there is only one.
 *
 * Invalid rows are reported in `errors`, and every project with at least one
 * invalid row is left out of `projects`: importing it without that row would
 * remove existing aims or milestone links from the project. Aim numbers of a
 * grant must be unique and consecutive starting at 1, as the aim number is the
 * position of the aim in the grant.
 *
 * Missing required columns still throw, as the whole file is unusable.
 */
const buildProjectsFromCsv = (
  aimsCsv: CsvData,
  milestonesCsv: CsvData,
): {
  projects: Record<string, ProjectImport>;
  errors: ImportError[];
  skippedProjects: number;
} => {
  validateRequiredColumns(aimsCsv.headers, REQUIRED_AIMS_COLUMNS);
  validateRequiredColumns(milestonesCsv.headers, REQUIRED_MILESTONES_COLUMNS);

  const aimColumns = {
    projectId: col(aimsCsv.headers, 'Project ID'),
    projectTitle: col(aimsCsv.headers, 'Project Title'),
    grantType: col(aimsCsv.headers, 'Grant Type'),
    aimNumber: col(aimsCsv.headers, 'Aim Number'),
    aimDescription: col(aimsCsv.headers, 'Aim Description'),
  };

  const milestoneColumns = {
    projectId: col(milestonesCsv.headers, 'Project ID'),
    projectTitle: col(milestonesCsv.headers, 'Project Title'),
    grantType: col(milestonesCsv.headers, 'Grant Type'),
    milestoneDescription: col(milestonesCsv.headers, 'Milestone Description'),
    aimNumbers: col(milestonesCsv.headers, 'Related Aim Number(s)'),
    status: col(milestonesCsv.headers, 'Milestone Status'),
  };

  const projects: Record<string, ProjectImport> = {};
  const errors: ImportError[] = [];
  const invalidProjectKeys = new Set<string>();
  const aimsCsvKeysByProjectId = new Map<string, Set<string>>();

  const addError = (
    key: string,
    file: 'aims' | 'milestones',
    row: number | '',
    projectId: string,
    projectTitle: string,
    grantType: string,
    error: unknown,
  ) => {
    invalidProjectKeys.add(key);
    errors.push({
      projectId,
      projectTitle,
      grantType,
      file,
      row,
      stage: 'validation',
      error: getErrorMessage(error),
    });
  };

  aimsCsv.rows.forEach((row, rowIndex) => {
    if (isEmptyRow(row)) return;

    const projectId = cell(row, aimColumns.projectId);
    const projectTitle = cell(row, aimColumns.projectTitle);
    const rawGrantType = cell(row, aimColumns.grantType);
    const key = projectKey(projectId, projectTitle);

    const keysOfProjectId = aimsCsvKeysByProjectId.get(projectId) ?? new Set();
    keysOfProjectId.add(key);
    aimsCsvKeysByProjectId.set(projectId, keysOfProjectId);

    try {
      const grantType = normalizeGrantType(rawGrantType);
      const aimNumber = parseAimNumber(cell(row, aimColumns.aimNumber));

      const project = projects[key] ?? {
        projectId,
        title: projectTitle,
        aimsByGrantType: { original: {}, supplement: {} },
        milestonesByGrantType: { original: {}, supplement: {} },
      };
      projects[key] = project;

      if (project.aimsByGrantType[grantType][aimNumber]) {
        throw new Error(
          `Duplicate Aim Number ${aimNumber} on the ${grantType} grant of project ${projectId}`,
        );
      }

      project.aimsByGrantType[grantType][aimNumber] = {
        aimNumber,
        description: cell(row, aimColumns.aimDescription),
        milestoneKeys: [],
      };
    } catch (error) {
      addError(
        key,
        'aims',
        csvLineNumber(rowIndex),
        projectId,
        projectTitle,
        rawGrantType,
        error,
      );
    }
  });

  Object.entries(projects).forEach(([key, project]) => {
    if (invalidProjectKeys.has(key)) return;

    GRANT_TYPES.forEach((grantType) => {
      const aimNumbers = Object.values(project.aimsByGrantType[grantType])
        .map((aim) => aim.aimNumber)
        .sort((a, b) => a - b);

      if (aimNumbers.some((aimNumber, index) => aimNumber !== index + 1)) {
        addError(
          key,
          'aims',
          '',
          project.projectId,
          project.title,
          grantType,
          new Error(
            `Aim Numbers of the ${grantType} grant must be consecutive starting at 1, found: ${aimNumbers.join(
              ', ',
            )}`,
          ),
        );
      }
    });
  });

  milestonesCsv.rows.forEach((row, rowIndex) => {
    if (isEmptyRow(row)) return;

    const projectId = cell(row, milestoneColumns.projectId);
    const projectTitle = cell(row, milestoneColumns.projectTitle);
    const rawGrantType = cell(row, milestoneColumns.grantType);
    let key = projectKey(projectId, projectTitle);

    try {
      const grantType = normalizeGrantType(rawGrantType);
      const milestoneKey = cell(row, milestoneColumns.milestoneDescription);
      const status = normalizeMilestoneStatus(
        cell(row, milestoneColumns.status),
      );

      const keysOfProjectId = [
        ...(aimsCsvKeysByProjectId.get(projectId) ?? []),
      ];

      if (!keysOfProjectId.includes(key)) {
        const [onlyKey] = keysOfProjectId;
        if (!onlyKey) {
          throw new Error(
            `Milestone references project ${projectId} that does not exist in aims CSV`,
          );
        }
        if (keysOfProjectId.length > 1) {
          throw new Error(
            `Milestone references project ${projectId} with title (${projectTitle}), which matches none of the ${keysOfProjectId.length} projects with that Project ID in aims CSV`,
          );
        }
        key = onlyKey;
      }

      const project = projects[key];

      if (!project) {
        throw new Error(`Project ${projectId} has invalid rows in aims CSV`);
      }

      const aimsBucket = project.aimsByGrantType[grantType];

      const relatedAims = cell(row, milestoneColumns.aimNumbers)
        .split(',')
        .map((value) => {
          const aimNumber = Number(value.trim());
          const aim = aimsBucket[aimNumber];
          if (!aim) {
            throw new Error(
              `Milestone "${milestoneKey}" references missing aim ${value.trim()} on project ${projectId}`,
            );
          }
          return aim;
        });

      project.milestonesByGrantType[grantType][milestoneKey] = {
        description: milestoneKey,
        status,
      };

      for (const aim of relatedAims) {
        if (!aim.milestoneKeys.includes(milestoneKey)) {
          aim.milestoneKeys.push(milestoneKey);
        }
      }
    } catch (error) {
      addError(
        key,
        'milestones',
        csvLineNumber(rowIndex),
        projectId,
        projectTitle,
        rawGrantType,
        error,
      );
    }
  });

  invalidProjectKeys.forEach((key) => {
    delete projects[key];
  });

  return { projects, errors, skippedProjects: invalidProjectKeys.size };
};

const getField = <T>(entry: Entry | undefined, field: string): T | undefined =>
  entry?.fields[field]?.[LOCALE] as T | undefined;

const getLinkIds = (entry: Entry | undefined, field: string) =>
  (getField<Link<'Entry'>[]>(entry, field) ?? []).map((link) => link.sys.id);

const areEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const fetchEntriesByIds = async (
  env: Environment,
  ids: string[],
): Promise<Map<string, Entry>> => {
  const entries = new Map<string, Entry>();
  const uniqueIds = [...new Set(ids)];

  for (let i = 0; i < uniqueIds.length; i += FETCH_PAGE_SIZE) {
    const response = await env.getEntries({
      'sys.id[in]': uniqueIds.slice(i, i + FETCH_PAGE_SIZE).join(','),
      limit: FETCH_PAGE_SIZE,
    });
    response.items.forEach((entry: Entry) => entries.set(entry.sys.id, entry));
  }

  return entries;
};

const inBatches = async <T>(
  items: T[],
  fn: (item: T) => Promise<void>,
): Promise<void> => {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    // Wait for the whole batch even when an item fails, so that every entry
    // it created is known before the error is handled.
    const results = await Promise.allSettled(
      items.slice(i, i + BATCH_SIZE).map(fn),
    );
    const failed = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failed) throw failed.reason;
  }
};

/**
 * Deletes entries created by a reconciliation that failed before they were
 * linked to the grant. Without this a new run would not find them and would
 * create them again.
 */
const deleteCreatedEntries = async (env: Environment, ids: string[]) => {
  for (const id of ids) {
    try {
      const entry = await env.getEntry(id);
      const draft = entry.isPublished() ? await entry.unpublish() : entry;
      await draft.delete();
    } catch (error) {
      console.warn(
        `Could not delete entry ${id} created by a failed import: ${getErrorMessage(
          error,
        )}`,
      );
    }
  }
};

/**
 * Reconciles the aims of one grant with the CSV data and returns the ordered
 * aim ids the grant should link to.
 *
 * - The aim number is its position in the grant's aims list. An existing aim
 *   of the grant is reused when it has the same description, wherever it is
 *   in the list (the one at the same position wins a tie); otherwise a new
 *   aim is created. When only the order changes, the grant's links are
 *   reordered and no aim is created.
 * - A milestone is reused when any existing aim of the grant already links a
 *   milestone with the same description; otherwise a new milestone is
 *   created. The status is only set on new milestones: a reused milestone
 *   keeps its current status, even if the CSV has another.
 * - A reused aim whose milestone links differ from the expected ones,
 *   including only in order, is updated with the new links.
 *
 * The id of every entry created here that nothing existing links to yet is
 * added to `createdEntryIds`, also when the reconciliation fails midway, so
 * that the caller can delete them if the grant is not saved.
 */
const reconcileGrantAims = async (
  env: Environment,
  project: ProjectImport,
  grantType: GrantBucket,
  existingAimIds: string[],
  createdEntryIds: string[] = [],
): Promise<{ aimIds: string[]; changed: boolean; stats: ImportStats }> => {
  const stats = createImportStats();
  const csvAims = Object.values(project.aimsByGrantType[grantType]).sort(
    (a, b) => a.aimNumber - b.aimNumber,
  );
  const csvMilestones = project.milestonesByGrantType[grantType];

  const existingAims = await fetchEntriesByIds(env, existingAimIds);
  const existingAimsInOrder = existingAimIds
    .map((id) => existingAims.get(id))
    .filter((entry): entry is Entry => !!entry);

  const usedAimIds = new Set<string>();
  const matchedAims = csvAims.map((aim, index) => {
    const isAvailableMatch = (entry: Entry | undefined): entry is Entry =>
      !!entry &&
      !usedAimIds.has(entry.sys.id) &&
      getField<string>(entry, 'description') === aim.description;

    const atSamePosition = existingAims.get(existingAimIds[index] ?? '');
    const match = isAvailableMatch(atSamePosition)
      ? atSamePosition
      : existingAimsInOrder.find(isAvailableMatch);

    if (match) {
      usedAimIds.add(match.sys.id);
    }
    return match;
  });

  const existingMilestones = await fetchEntriesByIds(
    env,
    existingAimsInOrder.flatMap((aim) => getLinkIds(aim, 'milestones')),
  );

  const milestoneIds: Record<string, string> = {};
  const milestonesToCreate: MilestoneImport[] = [];

  for (const milestone of Object.values(csvMilestones)) {
    const candidateIds = [
      ...csvAims.flatMap((aim, index) =>
        aim.milestoneKeys.includes(milestone.description)
          ? getLinkIds(matchedAims[index], 'milestones')
          : [],
      ),
      ...existingAimsInOrder.flatMap((aim) => getLinkIds(aim, 'milestones')),
    ];

    const reusedId = candidateIds.find(
      (id) =>
        getField<string>(existingMilestones.get(id), 'description') ===
        milestone.description,
    );

    if (reusedId) {
      milestoneIds[milestone.description] = reusedId;
      stats.milestonesReused += 1;
    } else {
      milestonesToCreate.push(milestone);
    }
  }

  await inBatches(milestonesToCreate, async (milestone) => {
    const milestoneEntry = await env.createEntry('milestones', {
      fields: {
        description: { [LOCALE]: milestone.description },
        status: { [LOCALE]: milestone.status },
        bulkImported: { [LOCALE]: true },
      },
    });
    createdEntryIds.push(milestoneEntry.sys.id);
    const published = await milestoneEntry.publish();
    milestoneIds[milestone.description] = published.sys.id;
    stats.milestonesCreated += 1;
  });

  const aimIds: string[] = [];

  for (const [index, aim] of csvAims.entries()) {
    const expectedMilestoneIds = aim.milestoneKeys.map((key) => {
      const id = milestoneIds[key];
      if (!id) {
        throw new Error(`Missing entryId for milestone ${key}`);
      }
      return id;
    });
    const milestoneLinks = expectedMilestoneIds.map((id) => getLinkEntity(id));
    const existing = matchedAims[index];

    if (!existing) {
      const aimEntry = await env.createEntry('aims', {
        fields: {
          description: { [LOCALE]: aim.description },
          milestones: { [LOCALE]: milestoneLinks },
        },
      });
      createdEntryIds.push(aimEntry.sys.id);
      const published = await aimEntry.publish();
      aimIds.push(published.sys.id);
      stats.aimsCreated += 1;
    } else if (
      !areEqual(getLinkIds(existing, 'milestones'), expectedMilestoneIds)
    ) {
      existing.fields.milestones = { [LOCALE]: milestoneLinks };
      const updated = await existing.update();
      expectedMilestoneIds.forEach((id) => {
        const createdIndex = createdEntryIds.indexOf(id);
        if (createdIndex !== -1) createdEntryIds.splice(createdIndex, 1);
      });
      await updated.publish();
      aimIds.push(existing.sys.id);
      stats.aimsUpdated += 1;
    } else {
      aimIds.push(existing.sys.id);
      stats.aimsUnchanged += 1;
    }
  }

  const changed = !areEqual(aimIds, existingAimIds);
  if (changed) {
    stats.grantsUpdated += 1;
  } else {
    stats.grantsUnchanged += 1;
  }

  return { aimIds, changed, stats };
};

/**
 * Reconciles the aims of one grant and saves the grant when its aim links
 * changed. If it fails before the grant is updated, the entries it created
 * are deleted so that a new run does not duplicate them.
 */
const reconcileAndSaveGrantAims = async (
  env: Environment,
  project: ProjectImport,
  grantType: GrantBucket,
  grantEntry: Entry,
  field: string,
): Promise<ImportStats> => {
  const createdEntryIds: string[] = [];
  let grantUpdated = false;

  try {
    const { aimIds, changed, stats } = await reconcileGrantAims(
      env,
      project,
      grantType,
      getLinkIds(grantEntry, field),
      createdEntryIds,
    );

    if (changed) {
      // eslint-disable-next-line no-param-reassign
      grantEntry.fields[field] = {
        [LOCALE]: aimIds.map((id) => getLinkEntity(id)),
      };
      const updated = await grantEntry.update();
      grantUpdated = true;
      await updated.publish();
    }

    return stats;
  } catch (error) {
    if (!grantUpdated) {
      await deleteCreatedEntries(env, createdEntryIds);
    }
    throw error;
  }
};

const importProjectAimsAndMilestones = async (
  env: Environment,
  project: ProjectImport,
): Promise<ImportStats> => {
  const { entry } = project;
  if (!entry) throw new Error(`Missing entry for ${project.projectId}`);

  const countAims = (grantType: GrantBucket) =>
    Object.keys(project.aimsByGrantType[grantType]).length;

  let stats = createImportStats();

  if (countAims('original') > 0) {
    stats = mergeImportStats(
      stats,
      await reconcileAndSaveGrantAims(
        env,
        project,
        'original',
        entry,
        'originalGrantAims',
      ),
    );
  }

  const supplementAimsCount = countAims('supplement');
  if (supplementAimsCount === 0) {
    return stats;
  }

  const supplementGrantLink = getField<Link<'Entry'>>(entry, 'supplementGrant');
  if (!supplementGrantLink) {
    console.warn(
      `Project ${project.projectId} has ${supplementAimsCount} supplement aims but no supplement grant entry. Skipping them.`,
    );
    return stats;
  }

  const supplementGrant = await env.getEntry(supplementGrantLink.sys.id);
  return mergeImportStats(
    stats,
    await reconcileAndSaveGrantAims(
      env,
      project,
      'supplement',
      supplementGrant,
      'aims',
    ),
  );
};

const resolveProjectEntry = async (
  env: Environment,
  project: ProjectImport,
): Promise<Entry> => {
  const response = await env.getEntries({
    content_type: 'projects',
    'fields.projectId': project.projectId,
  });

  const projectEntry = response.items.find(
    (entry: Entry) => getField<string>(entry, 'title') === project.title,
  );

  if (!projectEntry) {
    throw new Error(
      `Could not find project with project id ${project.projectId} and title (${project.title})`,
    );
  }

  return projectEntry;
};

type ImportResult = {
  stats: ImportStats;
  errors: ImportError[];
  importedProjects: number;
};

const importProjects = async (
  env: Environment,
  projects: ProjectImport[],
): Promise<ImportResult> => {
  let stats = createImportStats();
  const errors: ImportError[] = [];
  let importedProjects = 0;

  for (const project of projects) {
    console.log(
      `\n=== Importing aims and milestones for project ${project.projectId} (${project.title}) ===`,
    );
    let stage: ImportErrorStage = 'resolve';

    try {
      project.entry = await resolveProjectEntry(env, project);
      stage = 'import';
      stats = mergeImportStats(
        stats,
        await importProjectAimsAndMilestones(env, project),
      );
      importedProjects += 1;
      console.log(`✓ Completed project ${project.projectId}`);
    } catch (error) {
      const message = getErrorMessage(error);
      console.error(`✗ Failed project ${project.projectId}: ${message}`);
      errors.push({
        projectId: project.projectId,
        projectTitle: project.title,
        grantType: '',
        file: '',
        row: '',
        stage,
        error: message,
      });
    }
  }

  return { stats, errors, importedProjects };
};

const getDefaultErrorsCsvPath = (aimsCsvPath: string) => {
  const { dir, name } = path.parse(aimsCsvPath);
  return path.join(dir, `${name}-errors.csv`);
};

/**
 * Import flow:
 *
 * 1. Read aims and milestones CSV files and build an in-memory project model.
 *    Projects with invalid rows are skipped.
 * 2. For each project, resolve the existing Contentful Project entry and
 *    reconcile its aims and milestones with the CSV data, for the original
 *    grant (on the Project entry) and the supplement grant (on the linked
 *    Supplement Grant entry). See `reconcileGrantAims`. Entries are only
 *    created or updated when the existing data does not match, so the script
 *    can be run several times.
 * 3. Write every error to a CSV file and exit with code 1 if there was any.
 *
 * Notes:
 * - Projects must already exist in Contentful.
 * - A grant with no aims in the CSV is left untouched.
 * - Aim numbers must be unique and consecutive within a project grant.
 * - Milestone descriptions are expected to be unique within a project grant.
 */
const app = async () => {
  const aimsCsvPath = process.argv[2];
  const milestonesCsvPath = process.argv[3];
  if (!aimsCsvPath || !milestonesCsvPath) {
    throw new Error(
      'Usage: yarn import:aims-milestones <aims-csv-path> <milestones-csv-path> [errors-csv-path]',
    );
  }
  const errorsCsvPath = process.argv[4] ?? getDefaultErrorsCsvPath(aimsCsvPath);

  const env = await getContentfulEnvironment();

  console.log(`\n--- Building in-memory model ---`);
  const {
    projects,
    errors: validationErrors,
    skippedProjects,
  } = buildProjectsFromCsv(
    await readCsv(aimsCsvPath),
    await readCsv(milestonesCsvPath),
  );
  console.log(
    `Loaded ${
      Object.keys(projects).length
    } projects from CSVs, skipping ${skippedProjects} with invalid rows`,
  );

  const {
    stats,
    errors: importErrors,
    importedProjects,
  } = await importProjects(env, Object.values(projects));
  const errors = [...validationErrors, ...importErrors];

  console.log('\n--- Import complete ---');
  console.log(
    `Projects: ${importedProjects} imported, ${
      skippedProjects + importErrors.length
    } skipped or failed`,
  );
  console.log(
    `Aims: ${stats.aimsCreated} created, ${stats.aimsUpdated} updated, ${stats.aimsUnchanged} unchanged`,
  );
  console.log(
    `Milestones: ${stats.milestonesCreated} created, ${stats.milestonesReused} reused`,
  );
  console.log(
    `Grants: ${stats.grantsUpdated} updated, ${stats.grantsUnchanged} unchanged`,
  );

  if (errors.length > 0) {
    writeCsv(
      errorsCsvPath,
      ERRORS_CSV_HEADERS,
      errors.map(importErrorToCsvRow),
    );
    console.error(`\n${errors.length} errors written to ${errorsCsvPath}`);
    process.exitCode = 1;
  } else {
    console.log('\nNo errors.');
  }
};

app().catch((err) => {
  console.error(err);
  process.exit(1);
});
