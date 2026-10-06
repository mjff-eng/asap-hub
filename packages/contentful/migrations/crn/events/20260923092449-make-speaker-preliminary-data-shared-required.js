module.exports.description =
  'Make preliminary data shared on event speakers required.';

module.exports.up = (migration) => {
  const eventSpeakers = migration.editContentType('eventSpeakers');
  eventSpeakers.editField('preliminaryDataShared').required(true);
};

module.exports.down = (migration) => {
  const eventSpeakers = migration.editContentType('eventSpeakers');
  eventSpeakers.editField('preliminaryDataShared').required(false);
};
