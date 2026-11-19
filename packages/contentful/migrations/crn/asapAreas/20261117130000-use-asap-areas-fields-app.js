module.exports.description =
  'Use the ASAP Areas Fields app for the ASAP Areas members field';

const ASAP_AREAS_FIELDS_APP_ID = '2wdfXj21Nu8SUg6scoSSkU';

module.exports.up = (migration) => {
  const asapAreas = migration.editContentType('asapAreas');

  asapAreas.changeFieldControl('members', 'app', ASAP_AREAS_FIELDS_APP_ID, {
    helpText:
      'Shows the Team ASAP members who have this area on their membership. Drag to change the order. To add or remove someone, edit their Team ASAP membership.',
  });
};

module.exports.down = (migration) => {
  const asapAreas = migration.editContentType('asapAreas');

  asapAreas.changeFieldControl('members', 'builtin', 'entryLinksEditor', {
    helpText:
      'Shows the Team ASAP members who have this area on their membership. Drag to change the order. To add or remove someone, edit their Team ASAP membership.',
    bulkEditing: false,
    showLinkEntityAction: true,
    showCreateEntityAction: false,
  });
};
