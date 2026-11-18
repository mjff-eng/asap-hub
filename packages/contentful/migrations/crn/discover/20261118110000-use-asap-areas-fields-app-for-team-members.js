module.exports.description =
  'Use the ASAP Areas Fields app for the read-only ASAP Team Members field';

const ASAP_AREAS_FIELDS_APP_ID = '2wdfXj21Nu8SUg6scoSSkU';

module.exports.up = (migration) => {
  const discover = migration.editContentType('discover');

  discover.changeFieldControl('members', 'app', ASAP_AREAS_FIELDS_APP_ID, {
    helpText:
      'Filled automatically with the current ASAP Team members. To add or remove someone, edit their Teams.',
  });
};

module.exports.down = (migration) => {
  const discover = migration.editContentType('discover');

  discover.changeFieldControl('members', 'builtin', 'entryLinksEditor', {
    bulkEditing: false,
    showLinkEntityAction: true,
    showCreateEntityAction: true,
  });
};
