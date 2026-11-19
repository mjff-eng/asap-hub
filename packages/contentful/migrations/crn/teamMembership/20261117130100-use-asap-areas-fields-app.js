module.exports.description =
  'Use the ASAP Areas Fields app for the team membership ASAP Areas field';

const ASAP_AREAS_FIELDS_APP_ID = '2wdfXj21Nu8SUg6scoSSkU';

module.exports.up = (migration) => {
  const teamMembership = migration.editContentType('teamMembership');

  teamMembership.changeFieldControl(
    'asapAreas',
    'app',
    ASAP_AREAS_FIELDS_APP_ID,
    {},
  );
};

module.exports.down = (migration) => {
  const teamMembership = migration.editContentType('teamMembership');

  teamMembership.changeFieldControl(
    'asapAreas',
    'builtin',
    'entryLinksEditor',
    {
      helpText: 'This field is to be populated for Team ASAP membership only',
      bulkEditing: false,
      showLinkEntityAction: true,
      showCreateEntityAction: false,
    },
  );
};
