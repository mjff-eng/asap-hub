import { route, stringParser } from 'typesafe-routes';
import { outputDocumentTypeParser } from './network';

const createProjectRoute = () => {
  const about = route('/about', {}, {});
  const createManuscript = route('/create-manuscript', {}, {});
  const editManuscript = route(
    '/edit-manuscript/:manuscriptId',
    { manuscriptId: stringParser },
    {},
  );
  const resubmitManuscript = route(
    '/resubmit-manuscript/:manuscriptId',
    { manuscriptId: stringParser },
    {},
  );
  const createComplianceReport = route(
    '/create-compliance-report/:manuscriptId',
    { manuscriptId: stringParser },
    {},
  );
  const tool = route('/tool/:toolIndex', { toolIndex: stringParser }, {});
  const tools = route('/tools', {}, { tool });
  const workspace = route(
    '/workspace',
    {},
    {
      createManuscript,
      editManuscript,
      resubmitManuscript,
      createComplianceReport,
      tools,
    },
  );
  const milestones = route('/milestones', {}, {});
  const compliance = route('/compliance', {}, {});
  const outputs = route('/outputs', {}, {});
  const draftOutputs = route('/draft-outputs', {}, {});
  const createOutput = route(
    '/create-output/:outputDocumentType',
    { outputDocumentType: outputDocumentTypeParser },
    {},
  );
  const duplicateOutput = route('/duplicate/:id', { id: stringParser }, {});

  return route(
    '/:projectId',
    { projectId: stringParser },
    {
      about,
      workspace,
      milestones,
      compliance,
      outputs,
      draftOutputs,
      createOutput,
      duplicateOutput,
    },
  );
};

const discoveryProject = createProjectRoute();
const resourceProject = createProjectRoute();
const traineeProject = createProjectRoute();

const discoveryProjects = route('/discovery', {}, { discoveryProject });
const resourceProjects = route('/resource', {}, { resourceProject });
const traineeProjects = route('/trainee', {}, { traineeProject });
const projects = route(
  '/projects',
  {},
  { discoveryProjects, resourceProjects, traineeProjects },
);

export const projectRouteByType = {
  'Discovery Project': (projectId: string) =>
    projects({}).discoveryProjects({}).discoveryProject({ projectId }),
  'Resource Project': (projectId: string) =>
    projects({}).resourceProjects({}).resourceProject({ projectId }),
  'Trainee Project': (projectId: string) =>
    projects({}).traineeProjects({}).traineeProject({ projectId }),
} as const;

export const projectListRouteByType = {
  'Discovery Project': () => projects({}).discoveryProjects({}),
  'Resource Project': () => projects({}).resourceProjects({}),
  'Trainee Project': () => projects({}).traineeProjects({}),
} as const;

export default projects;
