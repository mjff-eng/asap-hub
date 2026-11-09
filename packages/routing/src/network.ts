import { route, stringParser } from 'typesafe-routes';

const user = (() => {
  const editPersonalInfo = route('/edit-personal-info', {}, {});
  const editContactInfo = route('/edit-contact-info', {}, {});
  const editOnboarded = route('/edit-onboarded', {}, {});
  const editBiography = route('/edit-biography', {}, {});

  const about = route(
    '/about',
    {},
    {
      editPersonalInfo,
      editContactInfo,
      editOnboarded,
      editBiography,
    },
  );

  const editExpertiseAndResources = route(
    '/edit-expertise-and-resources',
    {},
    {},
  );
  const editQuestions = route('/edit-questions', {}, {});

  const editRole = route('/edit-role', {}, {});
  const editTeamMembership = route(
    '/edit-team-membership/:teamId',
    { teamId: stringParser },
    {},
  );

  const overview = route(
    '/overview',
    {},
    {
      editPersonalInfo,
      editContactInfo,
      editOnboarded,
      editBiography,
      editQuestions,
      editExpertiseAndResources,
      editRole,
    },
  );

  const research = route(
    '/research',
    {},
    {
      editPersonalInfo,
      editContactInfo,
      editOnboarded,
      editExpertiseAndResources,
      editQuestions,
      editTeamMembership,
      editRole,
    },
  );

  const outputs = route(
    '/outputs',
    {},
    { editPersonalInfo, editContactInfo, editOnboarded },
  );

  const upcoming = route(
    '/upcoming',
    {},
    { editPersonalInfo, editContactInfo, editOnboarded },
  );

  const past = route(
    '/past',
    {},
    { editPersonalInfo, editContactInfo, editOnboarded },
  );

  return route(
    '/:userId',
    { userId: stringParser },
    { about, research, overview, outputs, upcoming, past },
  );
})();
const users = route('/users', {}, { user });

export const outputDocumentTypeParser = {
  parse: (data: string): OutputDocumentTypeParameter =>
    data as OutputDocumentTypeParameter,
  serialize: (data: OutputDocumentTypeParameter): string => data,
};
export type OutputDocumentTypeParameter =
  | 'article'
  | 'bioinformatics'
  | 'dataset'
  | 'lab-material'
  | 'protocol'
  | 'report';

const team = (() => {
  const about = route('/about', {}, {});
  const metrics = route('/metrics', {}, {});
  const workspace = route('/workspace', {}, {});

  const createOutput = route(
    '/create-output/:outputDocumentType',
    { outputDocumentType: outputDocumentTypeParser },
    {},
  );

  const upcoming = route('/upcoming', {}, {});
  const past = route('/past', {}, {});

  return route(
    '/:teamId',
    { teamId: stringParser },
    {
      about,
      metrics,
      workspace,
      createOutput,
      upcoming,
      past,
    },
  );
})();
const teams = route('/teams', {}, { team });
const discoveryTeams = route('/discovery-teams', {}, {});
const resourceTeams = route('/resource-teams', {}, {});

const interestGroup = (() => {
  const about = route('/about', {}, {});
  const calendar = route('/calendar', {}, {});
  const upcoming = route('/upcoming', {}, {});
  const past = route('/past', {}, {});

  return route(
    '/:interestGroupId',
    { interestGroupId: stringParser },
    { about, calendar, upcoming, past },
  );
})();
const interestGroups = route('/interest-groups', {}, { interestGroup });

const workingGroup = (() => {
  const draftOutputs = route('/draft-outputs', {}, {});
  const about = route('/about', {}, {});
  const outputs = route('/outputs', {}, {});
  const createOutput = route(
    '/create-output/:outputDocumentType',
    { outputDocumentType: outputDocumentTypeParser },
    {},
  );
  const duplicateOutput = route('/duplicate/:id', { id: stringParser }, {});
  const calendar = route('/calendar', {}, {});
  const upcoming = route('/upcoming', {}, {});
  const past = route('/past', {}, {});

  return route(
    '/:workingGroupId',
    { workingGroupId: stringParser },
    {
      about,
      createOutput,
      duplicateOutput,
      outputs,
      draftOutputs,
      calendar,
      upcoming,
      past,
    },
  );
})();

const workingGroups = route('/working-groups', {}, { workingGroup });

export default route(
  '/network',
  {},
  {
    users,
    discoveryTeams,
    resourceTeams,
    teams,
    interestGroups,
    workingGroups,
  },
);
