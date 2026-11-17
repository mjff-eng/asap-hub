module.exports.description =
  'Use the ASAP Areas Fields app for the About ASAP ASAP Areas field';

const ASAP_AREAS_FIELDS_APP_ID = '2wdfXj21Nu8SUg6scoSSkU';

module.exports.up = (migration) => {
  const discover = migration.editContentType('discover');

  discover.changeFieldControl('asapAreas', 'app', ASAP_AREAS_FIELDS_APP_ID, {
    helpText:
      'Drag to change the order the areas are shown on the About ASAP page.',
  });
};

module.exports.down = (migration) => {
  const discover = migration.editContentType('discover');

  discover.changeFieldControl('asapAreas', 'builtin', 'entryLinksEditor', {
    helpText:
      'Drag to change the order the areas are shown on the About ASAP page.',
    bulkEditing: false,
    showLinkEntityAction: true,
    showCreateEntityAction: false,
  });
};
