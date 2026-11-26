/* eslint-disable no-console */
// Contentful writes run one at a time to stay under the rate limit
/* eslint-disable no-await-in-loop, no-restricted-syntax */
/**
 * Moves every user's current labs (users.labs) into dated Lab Memberships
 * (users.labMemberships) and keeps the 2024 memberships as history (ASAP-1767).
 * users.labs is never changed: it stays the source of truth until the Hub reads
 * the memberships.
 *
 * Runs in preview mode unless DRY_RUN=false. Writes a backup and a report next
 * to this file; both hold entry ids only, never names.
 *
 * Usage:
 *   CONTENTFUL_SPACE_ID=<spaceId> \
 *   CONTENTFUL_MANAGEMENT_ACCESS_TOKEN=<cma token> \
 *   CONTENTFUL_ENV_ID=<environmentId> \
 *   DRY_RUN=false \
 *   yarn workspace @asap-hub/contentful migrate-user-labs
 */
import fs from 'fs/promises';
import { resolve } from 'path';
import { RateLimiter } from 'limiter';
import * as contentful from 'contentful-management';
import type { Entry, Environment, QueryOptions } from 'contentful-management';
import { addLocaleToFields, createLink } from '../src/utils/parse-fields';

// the day the 2024 lab membership attempt was rolled back in Production
export const ROLLBACK_DATE = '2025-02-06';

export type MembershipRecord = {
  id: string;
  createdAt: string;
  labId: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type UserRecord = {
  id: string;
  labIds: string[];
  membershipIds: string[];
};

export type UserPlan = {
  updates: { id: string; fields: { startDate?: string; endDate?: string } }[];
  creates: { labId: string; startDate: string }[];
  unlink: string[];
  anomalies: string[];
};

const toDay = (isoDate: string) => isoDate.slice(0, 10);

const inferStartDate = (labCreatedAt: string) =>
  toDay(labCreatedAt) > ROLLBACK_DATE ? toDay(labCreatedAt) : ROLLBACK_DATE;

export const linksChange = (plan: UserPlan) =>
  plan.creates.length > 0 || plan.unlink.length > 0;

export const planUser = (
  user: UserRecord,
  membershipsById: Map<string, MembershipRecord>,
  labCreatedAtById: Map<string, string>,
  runDate: string,
): UserPlan => {
  const plan: UserPlan = {
    updates: [],
    creates: [],
    unlink: [],
    anomalies: [],
  };
  const labIds = new Set(user.labIds);

  const linked = [...new Set(user.membershipIds)].flatMap((id) => {
    const membership = membershipsById.get(id);
    if (!membership?.labId) {
      plan.anomalies.push(`membership ${id} is missing or has no lab`);
      return [];
    }
    return [membership];
  });
  linked.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const openByLab = new Map<string, MembershipRecord>();
  linked.forEach((membership) => {
    const labId = membership.labId as string;
    if (membership.endDate) {
      return;
    }
    if (openByLab.has(labId)) {
      plan.unlink.push(membership.id);
      return;
    }
    openByLab.set(labId, membership);

    if (labIds.has(labId)) {
      if (!membership.startDate) {
        plan.updates.push({
          id: membership.id,
          fields: { startDate: toDay(membership.createdAt) },
        });
      }
      return;
    }

    if (membership.startDate) {
      plan.updates.push({ id: membership.id, fields: { endDate: runDate } });
      return;
    }

    const startDate = toDay(membership.createdAt);
    if (startDate > ROLLBACK_DATE) {
      plan.anomalies.push(
        `membership ${membership.id} was created on ${startDate}, after the ${ROLLBACK_DATE} end date`,
      );
      return;
    }
    plan.updates.push({
      id: membership.id,
      fields: { startDate, endDate: ROLLBACK_DATE },
    });
  });

  labIds.forEach((labId) => {
    if (openByLab.has(labId)) {
      return;
    }
    const labCreatedAt = labCreatedAtById.get(labId);
    if (!labCreatedAt) {
      plan.anomalies.push(`lab ${labId} in the Labs field does not exist`);
      return;
    }
    const leftBefore = linked.some((membership) => membership.labId === labId);
    plan.creates.push({
      labId,
      startDate: leftBefore ? runDate : inferStartDate(labCreatedAt),
    });
  });

  return plan;
};

export const openLabIds = (
  user: UserRecord,
  membershipsById: Map<string, MembershipRecord>,
) =>
  new Set(
    user.membershipIds.flatMap((id) => {
      const membership = membershipsById.get(id);
      return membership?.labId && !membership.endDate ? [membership.labId] : [];
    }),
  );

export const verify = (
  users: UserRecord[],
  membershipsById: Map<string, MembershipRecord>,
) =>
  users.flatMap((user) => {
    const open = openLabIds(user, membershipsById);
    const labIds = new Set(user.labIds);
    const missing = [...labIds].filter((labId) => !open.has(labId));
    const extra = [...open].filter((labId) => !labIds.has(labId));
    return missing.length || extra.length
      ? [{ userId: user.id, missing, extra }]
      : [];
  });

export const simulate = (
  users: UserRecord[],
  membershipsById: Map<string, MembershipRecord>,
  plans: Map<string, UserPlan>,
) => {
  const memberships = new Map(membershipsById);
  const simulatedUsers = users.map((user) => {
    const plan = plans.get(user.id);
    if (!plan) {
      return user;
    }
    plan.updates.forEach(({ id, fields }) => {
      const membership = memberships.get(id);
      if (membership) {
        memberships.set(id, { ...membership, ...fields });
      }
    });
    const createdIds = plan.creates.map(({ labId, startDate }) => {
      const id = `new-${user.id}-${labId}`;
      memberships.set(id, {
        id,
        createdAt: startDate,
        labId,
        startDate,
        endDate: null,
      });
      return id;
    });
    return {
      ...user,
      membershipIds: [
        ...user.membershipIds.filter((id) => !plan.unlink.includes(id)),
        ...createdIds,
      ],
    };
  });
  return { users: simulatedUsers, membershipsById: memberships };
};

type Link = { sys: { id: string } };

const PAGE_SIZE = 1000;

const rateLimiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 5000,
});

const callContentful = async <T>(request: () => Promise<T>) => {
  await rateLimiter.removeTokens(1);
  return request();
};

const getEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
};

// An entry with none of the selected fields set comes back from a select
// without a fields object
const fieldValue = <T>(entry: Entry, field: string): T | undefined =>
  entry.fields?.[field]?.['en-US'];

const linkIds = (entry: Entry, field: string) =>
  (fieldValue<Link[]>(entry, field) ?? []).map((link) => link.sys.id);

const fetchAll = async (environment: Environment, query: QueryOptions) => {
  const entries: Entry[] = [];
  let total = 0;
  do {
    const page = await callContentful(() =>
      environment.getEntries({
        ...query,
        order: 'sys.createdAt',
        limit: PAGE_SIZE,
        skip: entries.length,
      }),
    );
    total = page.total;
    entries.push(...page.items);
    if (page.items.length === 0) {
      break;
    }
  } while (entries.length < total);
  return entries;
};

const fetchUsers = (environment: Environment) =>
  fetchAll(environment, {
    content_type: 'users',
    'sys.archivedAt[exists]': false,
    select: 'sys,fields.labs,fields.labMemberships,fields.connections',
  });

const fetchMemberships = (environment: Environment) =>
  fetchAll(environment, {
    content_type: 'labMembership',
    select: 'sys,fields.lab,fields.role,fields.startDate,fields.endDate',
  });

const fetchLabs = (environment: Environment) =>
  fetchAll(environment, { content_type: 'labs', select: 'sys' });

export const toUserRecord = (entry: Entry): UserRecord => ({
  id: entry.sys.id,
  labIds: [...new Set(linkIds(entry, 'labs'))],
  membershipIds: linkIds(entry, 'labMemberships'),
});

export const toMembershipRecord = (entry: Entry): MembershipRecord => ({
  id: entry.sys.id,
  createdAt: entry.sys.createdAt,
  labId: fieldValue<Link>(entry, 'lab')?.sys.id ?? null,
  startDate: fieldValue<string>(entry, 'startDate') ?? null,
  endDate: fieldValue<string>(entry, 'endDate') ?? null,
});

const isPublishedWithoutDraft = (entry: Entry) =>
  entry.isPublished() && !entry.isUpdated();

type ContentfulErrorData = {
  status?: number;
  requestId?: string;
  details?: { errors?: { name?: string; path?: unknown }[] };
};

// The SDK puts the request body in the error message, and for a user update
// that body is the user's personal data. The report goes into a workflow
// artifact that anyone can download.
export const describeError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  try {
    const { status, requestId, details }: ContentfulErrorData = JSON.parse(
      error.message,
    );
    const fieldErrors = (details?.errors ?? []).map(
      ({ name, path }) => `${name} at ${JSON.stringify(path)}`,
    );
    return [error.name, status, requestId, ...fieldErrors]
      .filter(Boolean)
      .join(', ');
  } catch {
    return String(error);
  }
};

type Skipped = { userId: string; reason: string; message?: string };

const writeUser = async (
  environment: Environment,
  userId: string,
  plan: UserPlan,
): Promise<Skipped | null> => {
  const userEntry = linksChange(plan)
    ? await callContentful(() => environment.getEntry(userId))
    : null;
  if (userEntry && !isPublishedWithoutDraft(userEntry)) {
    return { userId, reason: 'draft' };
  }

  for (const { id, fields } of plan.updates) {
    const entry = await callContentful(() => environment.getEntry(id));
    Object.entries(fields).forEach(([field, value]) => {
      entry.fields[field] = { 'en-US': value };
    });
    const updated = await callContentful(() => entry.update());
    await callContentful(() => updated.publish());
  }

  if (!userEntry) {
    return null;
  }

  const created: Entry[] = [];
  let savedUser: Entry;
  try {
    for (const { labId, startDate } of plan.creates) {
      created.push(
        await callContentful(() =>
          environment.createEntry('labMembership', {
            fields: addLocaleToFields({ lab: createLink(labId), startDate }),
          }),
        ),
      );
    }
    const links = (fieldValue<Link[]>(userEntry, 'labMemberships') ?? [])
      .filter((link) => !plan.unlink.includes(link.sys.id))
      .concat(created.map((entry) => createLink(entry.sys.id)));
    userEntry.fields.labMemberships = { 'en-US': links };
    savedUser = await callContentful(() => userEntry.update());
  } catch (error) {
    for (const entry of created) {
      await callContentful(() => entry.delete());
    }
    return { userId, reason: 'update-failed', message: describeError(error) };
  }

  for (const entry of created) {
    await callContentful(() => entry.publish());
  }
  try {
    await callContentful(() => savedUser.publish());
  } catch (error) {
    return { userId, reason: 'publish-failed', message: describeError(error) };
  }
  return null;
};

const main = async () => {
  const spaceId = getEnv('CONTENTFUL_SPACE_ID');
  const environmentId = getEnv('CONTENTFUL_ENV_ID');
  const dryRun = process.env.DRY_RUN !== 'false';
  const runDate = toDay(new Date().toISOString());
  const startedAt = new Date().toISOString().replace(/[:.]/g, '-');
  const entryUrl = (id: string) =>
    `https://app.contentful.com/spaces/${spaceId}/environments/${environmentId}/entries/${id}`;

  console.log(
    `Migrating user labs in ${environmentId}${
      dryRun ? ' (DRY RUN, no writes)' : ''
    }...`,
  );

  const client = contentful.createClient({
    accessToken: getEnv('CONTENTFUL_MANAGEMENT_ACCESS_TOKEN'),
  });
  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment(environmentId);

  const userEntries = await fetchUsers(environment);
  const membershipEntries = await fetchMemberships(environment);
  const labEntries = await fetchLabs(environment);

  const backupPath = resolve(
    __dirname,
    `lab-memberships-backup-${environmentId}-${startedAt}.json`,
  );
  await fs.writeFile(
    backupPath,
    JSON.stringify(
      {
        environmentId,
        createdAt: new Date().toISOString(),
        users: userEntries.map((entry) => ({
          id: entry.sys.id,
          labs: linkIds(entry, 'labs'),
          labMemberships: linkIds(entry, 'labMemberships'),
          published: entry.isPublished(),
          changed: entry.isUpdated(),
        })),
        labMemberships: membershipEntries.map((entry) => ({
          ...toMembershipRecord(entry),
          role: fieldValue<string>(entry, 'role') ?? null,
          published: entry.isPublished(),
        })),
        labs: labEntries.map((entry) => ({
          id: entry.sys.id,
          createdAt: entry.sys.createdAt,
        })),
      },
      null,
      2,
    ),
  );
  console.log(`Backup saved to: ${backupPath}`);

  const users = userEntries.map(toUserRecord);
  const membershipsById = new Map(
    membershipEntries.map((entry) => [entry.sys.id, toMembershipRecord(entry)]),
  );
  const labCreatedAtById = new Map(
    labEntries.map((entry) => [entry.sys.id, entry.sys.createdAt]),
  );
  const userEntriesById = new Map(
    userEntries.map((entry) => [entry.sys.id, entry]),
  );
  const linkCountByMembershipId = new Map<string, number>();
  users.forEach((user) =>
    new Set(user.membershipIds).forEach((id) =>
      linkCountByMembershipId.set(
        id,
        (linkCountByMembershipId.get(id) ?? 0) + 1,
      ),
    ),
  );

  const plans = new Map<string, UserPlan>();
  const skipped: Skipped[] = [];
  users.forEach((user) => {
    // a membership shared by two users would get conflicting end dates
    if (
      user.membershipIds.some(
        (id) => (linkCountByMembershipId.get(id) ?? 0) > 1,
      )
    ) {
      skipped.push({ userId: user.id, reason: 'shared-membership' });
      return;
    }
    const plan = planUser(user, membershipsById, labCreatedAtById, runDate);
    const entry = userEntriesById.get(user.id) as Entry;
    if (linksChange(plan) && !isPublishedWithoutDraft(entry)) {
      skipped.push({ userId: user.id, reason: 'draft' });
      return;
    }
    plans.set(user.id, plan);
  });

  const usersWithWrites = [...plans].filter(
    ([, plan]) => plan.updates.length || linksChange(plan),
  );
  const republished = usersWithWrites.filter(([, plan]) => linksChange(plan));
  const republishedWithoutConnections = republished
    .filter(
      ([userId]) =>
        !fieldValue<unknown[]>(
          userEntriesById.get(userId) as Entry,
          'connections',
        )?.length,
    )
    .map(([userId]) => ({ userId, url: entryUrl(userId) }));

  if (!dryRun) {
    let done = 0;
    for (const [userId, plan] of usersWithWrites) {
      try {
        const result = await writeUser(environment, userId, plan);
        if (result) {
          skipped.push(result);
        }
      } catch (error) {
        skipped.push({
          userId,
          reason: 'error',
          message: describeError(error),
        });
      }
      done += 1;
      if (done % 50 === 0 || done === usersWithWrites.length) {
        console.log(`Written ${done}/${usersWithWrites.length} users`);
      }
    }
  }

  const finalState = dryRun
    ? simulate(users, membershipsById, plans)
    : {
        users: (await fetchUsers(environment)).map(toUserRecord),
        membershipsById: new Map(
          (await fetchMemberships(environment)).map((entry) => [
            entry.sys.id,
            toMembershipRecord(entry),
          ]),
        ),
      };
  const skippedIds = new Set(skipped.map(({ userId }) => userId));
  const differences = verify(finalState.users, finalState.membershipsById)
    .filter(({ userId }) => !skippedIds.has(userId))
    .map((difference) => ({ ...difference, url: entryUrl(difference.userId) }));

  const allPlans = [...plans];
  const counts = {
    usersScanned: users.length,
    usersWithLabs: users.filter((user) => user.labIds.length).length,
    labMemberships: membershipEntries.length,
    labMembershipsUnpublished: membershipEntries.filter(
      (entry) => !entry.isPublished(),
    ).length,
    labMembershipsNotLinkedFromUsers: membershipEntries.filter(
      (entry) => !linkCountByMembershipId.has(entry.sys.id),
    ).length,
    labMembershipsLinkedFromSeveralUsers: [
      ...linkCountByMembershipId.values(),
    ].filter((count) => count > 1).length,
    usersAlreadyMatching: users.filter(
      (user) =>
        user.labIds.length > 0 && verify([user], membershipsById).length === 0,
    ).length,
    membershipsToUpdate: allPlans.reduce(
      (sum, [, plan]) => sum + plan.updates.length,
      0,
    ),
    membershipsToCreate: allPlans.reduce(
      (sum, [, plan]) => sum + plan.creates.length,
      0,
    ),
    membershipsToUnlink: allPlans.reduce(
      (sum, [, plan]) => sum + plan.unlink.length,
      0,
    ),
    usersToRepublish: republished.length,
    usersToRepublishWithoutConnections: republishedWithoutConnections.length,
    usersSkipped: skipped.length,
    differences: differences.length,
  };

  const reportPath = resolve(
    __dirname,
    `lab-memberships-report-${environmentId}-${startedAt}.json`,
  );
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        environmentId,
        dryRun,
        runDate,
        counts,
        skipped: skipped.map((item) => ({
          ...item,
          url: entryUrl(item.userId),
        })),
        differences,
        unlinked: allPlans.flatMap(([userId, plan]) =>
          plan.unlink.map((membershipId) => ({
            userId,
            membershipId,
            url: entryUrl(userId),
          })),
        ),
        anomalies: allPlans.flatMap(([userId, plan]) =>
          plan.anomalies.map((message) => ({
            userId,
            message,
            url: entryUrl(userId),
          })),
        ),
        republishedWithoutConnections,
      },
      null,
      2,
    ),
  );
  console.log(`Report saved to: ${reportPath}`);

  const summary = [
    `## Migrate user labs: ${environmentId}${dryRun ? ' (dry run)' : ''}`,
    '',
    '| Count | Value |',
    '| --- | --- |',
    ...Object.entries(counts).map(([name, value]) => `| ${name} | ${value} |`),
  ].join('\n');
  console.log(`\n${summary}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }

  if (differences.length) {
    console.error(
      `${differences.length} users still have open memberships that differ from their Labs field.`,
    );
    process.exitCode = 1;
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exitCode = 1;
  });
}
