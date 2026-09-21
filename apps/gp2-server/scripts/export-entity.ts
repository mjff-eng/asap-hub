import { EntityResponses } from '@asap-hub/algolia';
import { gp2 as gp2Model, ListResponse } from '@asap-hub/model';
import { promises as fs } from 'fs';
import Events from '../src/controllers/event.controller';
import ExternalUsers from '../src/controllers/external-user.controller';
import News from '../src/controllers/news.controller';
import Outputs from '../src/controllers/output.controller';
import Projects from '../src/controllers/project.controller';
import Users from '../src/controllers/user.controller';
import WorkingGroups from '../src/controllers/working-group.controller';
import { AssetContentfulDataProvider } from '../src/data-providers/asset.data-provider';
import { EventContentfulDataProvider } from '../src/data-providers/event.data-provider';
import { ExternalUserContentfulDataProvider } from '../src/data-providers/external-user.data-provider';
import { NewsContentfulDataProvider } from '../src/data-providers/news.data-provider';
import { OutputContentfulDataProvider } from '../src/data-providers/output.data-provider';
import { ProjectContentfulDataProvider } from '../src/data-providers/project.data-provider';
import { UserContentfulDataProvider } from '../src/data-providers/user.data-provider';
import { WorkingGroupContentfulDataProvider } from '../src/data-providers/working-group.data-provider';
import {
  getContentfulGraphQLClientFactory,
  getContentfulRestClientFactory,
} from '../src/dependencies/clients.dependency';

export type ExportFormat = 'json' | 'csv';
export const exportFormats: ExportFormat[] = ['json', 'csv'];

export type ExportOptions = {
  filename?: string;
  format?: ExportFormat;
  includeHidden?: boolean;
  includeNotOnboarded?: boolean;
};

const isWorkingGroupController = (
  controller:
    | Events
    | ExternalUsers
    | News
    | Outputs
    | Projects
    | Users
    | WorkingGroups,
): controller is WorkingGroups => controller instanceof WorkingGroups;

const isUserController = (
  controller:
    | Events
    | ExternalUsers
    | News
    | Outputs
    | Projects
    | Users
    | WorkingGroups,
): controller is Users => controller instanceof Users;

type EntityResponsesGP2 = EntityResponses['gp2'];
type EntityRecord = EntityResponsesGP2[keyof EntityResponsesGP2];

export const exportEntity = async (
  entity: keyof EntityResponsesGP2,
  {
    filename,
    format = 'json',
    includeHidden = false,
    includeNotOnboarded = false,
  }: ExportOptions = {},
): Promise<void> => {
  const controller = getController(entity);
  const outputFile = filename || `${entity}.${format}`;
  const file = await fs.open(outputFile, 'w');

  let recordCount = 0;
  let total: number;
  let records: ListResponse<EntityRecord>;
  let page = 1;
  const flatRecords: Record<string, unknown>[] = [];

  if (format === 'json') {
    await file.write('[\n');
  }

  const take = 10;
  do {
    if (isWorkingGroupController(controller)) {
      records = await controller.fetch();
    } else if (isUserController(controller)) {
      records = await controller.fetch({
        take,
        skip: (page - 1) * take,
        filter: {
          onlyOnboarded: !includeNotOnboarded,
          hidden: !includeHidden,
        },
      });
    } else {
      records = await controller.fetch({
        take,
        skip: (page - 1) * take,
      });
    }

    total = records.total;

    if (format === 'json') {
      if (page != 1 && records.items.length) {
        await file.write(',\n');
      }

      await file.write(
        JSON.stringify(
          records.items.map((record) => transformRecords(record, entity)),
          null,
          2,
        ).slice(1, -1),
      );
    } else {
      records.items.forEach((record) => {
        flatRecords.push(flattenRecord(transformRecords(record, entity)));
      });
    }

    page++;
    recordCount += records.items.length;
  } while (total > recordCount);

  if (format === 'json') {
    await file.write(']');
  } else {
    await file.write(toCsv(flatRecords, entity));
  }

  await file.close();

  console.log(`Finished exporting ${recordCount} records to ${outputFile}`);
};

const userColumns: (keyof gp2Model.UserResponse | 'membershipStatus')[] = [
  'id',
  'firstName',
  'middleName',
  'lastName',
  'nickname',
  'email',
  'alternativeEmail',
  'orcid',
  'role',
  'onboarded',
  'membershipStatus',
  'alumniSinceDate',
  'region',
  'country',
  'stateOrProvince',
  'city',
  'degrees',
  'positions',
  'projects',
  'workingGroups',
  'contributingCohorts',
  'tags',
  'createdDate',
  'lastModifiedDate',
  'activatedDate',
];

const toCell = (value: unknown): string | number => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return String(value);
  if (typeof value !== 'object') return value as string | number;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === 'object') {
          const named = item as {
            name?: string;
            title?: string;
            role?: string;
          };
          const label = named.name ?? named.title;
          if (label) return named.role ? `${label} (${named.role})` : label;
          return Object.values(item)
            .filter(
              (v) => v !== null && v !== undefined && typeof v !== 'object',
            )
            .join(', ');
        }
        return toCell(item);
      })
      .join('; ');
  }
  return JSON.stringify(value);
};

const flattenRecord = (record: object): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => !['objectID', '__meta', '_tags'].includes(key))
      .map(([key, value]) => [key, toCell(value)]),
  );

const toCsv = (
  rows: Record<string, unknown>[],
  entity: keyof EntityResponsesGP2,
): string => {
  const columns =
    entity === 'user'
      ? userColumns
      : Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  const escape = (value: unknown): string => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const toLine = (values: unknown[]) => values.map(escape).join(',');

  return [
    toLine(columns),
    ...rows.map((row) => toLine(columns.map((column) => row[column]))),
  ].join('\n');
};

const getController = (entity: keyof EntityResponsesGP2) => {
  const graphQLClient = getContentfulGraphQLClientFactory();

  const outputDataProvider = new OutputContentfulDataProvider(
    graphQLClient,
    getContentfulRestClientFactory,
  );
  const externalUserDataProvider = new ExternalUserContentfulDataProvider(
    graphQLClient,
    getContentfulRestClientFactory,
  );
  const projectDataProvider = new ProjectContentfulDataProvider(
    graphQLClient,
    getContentfulRestClientFactory,
  );
  const eventDataProvider = new EventContentfulDataProvider(
    graphQLClient,
    getContentfulRestClientFactory,
  );
  const userDataProvider = new UserContentfulDataProvider(
    graphQLClient,
    getContentfulRestClientFactory,
  );
  const assetDataProvider = new AssetContentfulDataProvider(
    getContentfulRestClientFactory,
  );
  const newsDataProvider = new NewsContentfulDataProvider(graphQLClient);

  const workingGroupDataProvider = new WorkingGroupContentfulDataProvider(
    graphQLClient,
    getContentfulRestClientFactory,
  );

  const controllerMap = {
    output: new Outputs(outputDataProvider, externalUserDataProvider),
    project: new Projects(projectDataProvider),
    event: new Events(eventDataProvider),
    user: new Users(userDataProvider, assetDataProvider),
    news: new News(newsDataProvider),
    'external-user': new ExternalUsers(externalUserDataProvider),
    'working-group': new WorkingGroups(workingGroupDataProvider),
  };

  return controllerMap[entity];
};

export const transformRecords = <
  T extends EntityResponsesGP2,
  K extends keyof T,
>(
  record: T[K] extends EntityResponsesGP2[keyof EntityResponsesGP2]
    ? T[K] & { id: string }
    : never,
  type: K extends keyof EntityResponsesGP2 ? K : never,
) => {
  const payload = {
    ...record,
    objectID: record.id,
    __meta: {
      type,
    },
    ...(type === 'user' && {
      membershipStatus: (record as gp2Model.UserResponse).alumniSinceDate
        ? 'Alumni Member'
        : 'GP2 Member',
    }),
  };

  if ('tags' in record) {
    const tags = record.tags?.map((tag) => {
      if (typeof tag === 'object') {
        return tag.name;
      }
      return tag;
    });

    return {
      ...payload,
      _tags: tags ? tags : [],
    };
  }

  return payload;
};
