module.exports.description =
  'Remove legacy preliminary data shared field from events.';

module.exports.up = (migration) => {
  const events = migration.editContentType('events');
  events.deleteField('preliminaryDataShared');
};

module.exports.down = (migration) => {
  const events = migration.editContentType('events');

  events
    .createField('preliminaryDataShared')
    .name('Preliminary Data Shared')
    .type('Array')
    .localized(false)
    .required(false)
    .validations([])
    .disabled(false)
    .omitted(false)
    .items({
      type: 'Link',

      validations: [
        {
          linkContentType: ['preliminaryDataSharing'],
        },
      ],

      linkType: 'Entry',
    });

  events.changeFieldControl(
    'preliminaryDataShared',
    'app',
    'Yp64pYYDuRNHdvAAAJPYa',
    {
      entityName: 'team',
      bulkEditing: false,
      showUserEmail: false,
      booleanFieldName: 'preliminaryDataShared',
      showLinkEntityAction: false,
      showCreateEntityAction: true,
    },
  );
};
