import { EntityData, EntityResponses } from '@asap-hub/algolia';
import {
  ListResponse,
  NewsResponse,
  ResearchTagDataObject,
} from '@asap-hub/model';
import { promises as fs } from 'fs';
import Events from '../src/controllers/event.controller';
import ExternalAuthors from '../src/controllers/external-author.controller';
import News from '../src/controllers/news.controller';
import Projects from '../src/controllers/project.controller';
import ResearchOutputs from '../src/controllers/research-output.controller';
import Teams from '../src/controllers/team.controller';
import Tutorials from '../src/controllers/tutorial.controller';
import Users from '../src/controllers/user.controller';
import WorkingGroups from '../src/controllers/working-group.controller';
import InterestGroups from '../src/controllers/interest-group.controller';
import Manuscripts from '../src/controllers/manuscript.controller';
import ManuscriptVersions from '../src/controllers/manuscript-version.controller';
import { getEventDataProvider } from '../src/dependencies/events.dependencies';
import { getExternalAuthorDataProvider } from '../src/dependencies/external-authors.dependencies';
import { getNewsDataProvider } from '../src/dependencies/news.dependencies';
import { getProjectDataProvider } from '../src/dependencies/projects.dependencies';
import { getResearchOutputDataProvider } from '../src/dependencies/research-outputs.dependencies';
import { getResearchTagDataProvider } from '../src/dependencies/research-tags.dependencies';
import { getTeamDataProvider } from '../src/dependencies/team.dependencies';
import { getTutorialDataProvider } from '../src/dependencies/tutorial.dependencies';

import {
  getAssetDataProvider,
  getUserDataProvider,
  getResearchTagsDataProvider,
} from '../src/dependencies/users.dependencies';
import { getWorkingGroupDataProvider } from '../src/dependencies/working-groups.dependencies';
import { getInterestGroupDataProvider } from '../src/dependencies/interest-groups.dependencies';
import { getManuscriptsDataProvider } from '../src/dependencies/manuscripts.dependencies';
import { getManuscriptVersionsDataProvider } from '../src/dependencies/manuscript-versions.dependencies';

type EntityResponsesCRN = EntityResponses['crn'];
export const PAGE_SIZE = 10;
export const exportEntity = async (
  entity: keyof EntityResponsesCRN,
  filename?: string,
): Promise<void> => {
  const controller = getController(entity);
  const file = await fs.open(filename || `${entity}.json`, 'w');
  const isManuscriptVersionEntity = entity === 'manuscript-version';
  let recordCount = 0;

  await file.write('[\n');

  let total: number;
  let records: ListResponse<EntityData>;
  let recordsFetched: number;
  let page = 1;
  let shouldContinue: boolean;
  do {
    records = await controller.fetch({
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    });

    total = records.total;
    recordsFetched = records.items.length;

    if (recordsFetched) {
      if (recordCount > 0) {
        await file.write(',\n');
      }

      await file.write(
        JSON.stringify(
          records.items.map((record) => transformRecords(record, entity)),
          null,
          2,
        ).slice(1, -1),
      );
    }

    page++;
    recordCount += recordsFetched;

    // Page through `total`: data providers can skip items (events without a
    // published calendar), so the exported count can stay below it.
    shouldContinue = isManuscriptVersionEntity
      ? total !== 0
      : (page - 1) * PAGE_SIZE < total;
  } while (shouldContinue);

  await file.write(']');

  console.log(`Finished exporting ${recordCount} records`);
};

const getController = (entity: keyof EntityResponsesCRN) => {
  const userDataProvider = getUserDataProvider();

  const researchOutputDataProvider = getResearchOutputDataProvider();
  const researchTagDataProvider = getResearchTagDataProvider();
  const externalAuthorDataProvider = getExternalAuthorDataProvider();

  const assetDataProvider = getAssetDataProvider();

  const eventDataProvider = getEventDataProvider();

  const teamDataProvider = getTeamDataProvider();
  const workingGroupDataProvider = getWorkingGroupDataProvider();
  const tutorialDataProvider = getTutorialDataProvider();
  const newsDataProvider = getNewsDataProvider();
  const projectDataProvider = getProjectDataProvider();
  const interestGroupDataProvider = getInterestGroupDataProvider();
  const manuscriptDataProvider = getManuscriptsDataProvider();
  const manuscriptVersionDataProvider = getManuscriptVersionsDataProvider();

  const controllerMap = {
    user: new Users(
      userDataProvider,
      assetDataProvider,
      getResearchTagsDataProvider(),
    ),
    'research-output': new ResearchOutputs(
      researchOutputDataProvider,
      researchTagDataProvider,
      externalAuthorDataProvider,
    ),
    'external-author': new ExternalAuthors(externalAuthorDataProvider),
    event: new Events(eventDataProvider),
    team: new Teams(teamDataProvider),
    'working-group': new WorkingGroups(workingGroupDataProvider),
    'interest-group': new InterestGroups(
      interestGroupDataProvider,
      userDataProvider,
    ),
    tutorial: new Tutorials(tutorialDataProvider),
    news: new News(newsDataProvider),
    project: new Projects(projectDataProvider),
    manuscript: new Manuscripts(
      manuscriptDataProvider,
      externalAuthorDataProvider,
      assetDataProvider,
    ),
    'manuscript-version': new ManuscriptVersions(manuscriptVersionDataProvider),
  };

  return controllerMap[entity];
};

const getTagNames = (
  tags?: Pick<ResearchTagDataObject, 'id' | 'name'>[],
): string[] =>
  tags
    ? tags.flatMap(
        (tag) => (tag as Pick<ResearchTagDataObject, 'id' | 'name'>).name,
      )
    : [];

const transformRecords = (
  record: EntityData,
  type: keyof EntityResponsesCRN,
): EntityData & {
  objectID: string;
  __meta: { type: string };
  _tags: string[];
} => {
  const payload = {
    ...record,
    objectID: record.id,
    __meta: {
      type,
    },
  };

  // type 'research-output'
  if ('subtype' in record) {
    const { description: _description, ...payloadWithoutDescription } =
      payload as typeof payload & { description?: string };
    const subtype = record.subtype;

    return {
      ...payloadWithoutDescription,
      _tags: [
        ...record.methods,
        ...record.organisms,
        ...record.environments,
        ...(subtype ? [subtype] : []),
        ...record.keywords,
      ],
    } as ReturnType<typeof transformRecords>;
  }

  // type 'user'
  if ('onboarded' in record) {
    return {
      ...payload,
      _tags: getTagNames(record.tags),
    };
  }

  // type 'event'
  if ('speakers' in record) {
    return {
      ...payload,
      _tags: getTagNames(record.tags),
    };
  }

  // type 'team'
  if ('projectTitle' in record) {
    return {
      ...payload,
      _tags: getTagNames(record.tags),
    };
  }

  // type 'working-group'
  if ('deliverables' in record) {
    return {
      ...payload,
      _tags: record.tags,
    };
  }

  // type 'project' // moved up here for order to have better type inference
  if ('projectType' in record && 'tags' in record) {
    return {
      ...payload,
      _tags: record.tags,
    };
  }

  // type 'interest-group'
  if ('tools' in record) {
    return {
      ...payload,
      _tags: getTagNames(record.tags),
    };
  }

  // type 'tutorial'
  if ('usedInPublication' in record && 'shortText' in record) {
    const { text: _text, ...payloadWithoutText } = payload as typeof payload & {
      text?: string;
    };

    return {
      ...payloadWithoutText,
      _tags: record.tags,
    } as ReturnType<typeof transformRecords>;
  }

  // type 'news'
  if ('frequency' in record) {
    const { text: _text, ...rest } = payload as NewsResponse;
    return {
      ...rest,
      _tags: record.tags,
    } as ReturnType<typeof transformRecords>;
  }

  return {
    ...payload,
    _tags: [],
  };
};
