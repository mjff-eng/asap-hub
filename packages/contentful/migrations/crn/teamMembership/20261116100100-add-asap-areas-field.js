module.exports.description = 'Add ASAP Areas field to team membership';

module.exports.up = (migration) => {
  const teamMembership = migration.editContentType('teamMembership');

  teamMembership
    .createField('asapAreas')
    .name('ASAP Areas')
    .type('Array')
    .localized(false)
    .required(false)
    .validations([])
    .disabled(false)
    .omitted(false)
    .items({
      type: 'Link',
      validations: [{ linkContentType: ['asapAreas'] }],
      linkType: 'Entry',
    });

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

module.exports.down = (migration) => {
  const teamMembership = migration.editContentType('teamMembership');
  teamMembership.deleteField('asapAreas');
};
