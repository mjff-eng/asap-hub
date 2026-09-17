module.exports.description =
  'Add preliminary data shared and project fields to event speakers.';

module.exports.up = (migration) => {
  const eventSpeakers = migration.editContentType('eventSpeakers');

  eventSpeakers
    .createField('preliminaryDataShared')
    .name('Preliminary Data Shared')
    .type('Boolean')
    .localized(false)
    .required(true)
    .validations([])
    .disabled(false)
    .omitted(false);

  eventSpeakers
    .createField('project')
    .name('Project')
    .type('Link')
    .localized(false)
    .required(false)
    .validations([
      {
        linkContentType: ['projects'],
      },
    ])
    .disabled(false)
    .omitted(false)
    .linkType('Entry');

  eventSpeakers.changeFieldControl(
    'preliminaryDataShared',
    'builtin',
    'boolean',
    {},
  );

  eventSpeakers.changeFieldControl('project', 'builtin', 'entryLinkEditor', {
    showLinkEntityAction: true,
    showCreateEntityAction: false,
  });

  eventSpeakers.moveField('preliminaryDataShared').afterField('user');
  eventSpeakers.moveField('project').beforeField('team');
};

module.exports.down = (migration) => {
  const eventSpeakers = migration.editContentType('eventSpeakers');
  eventSpeakers.deleteField('preliminaryDataShared');
  eventSpeakers.deleteField('project');
};
