module.exports.description =
  'Rename Discover ASAP to About ASAP and add ASAP Areas and CNS Quest Members fields';

module.exports.up = (migration) => {
  const discover = migration.editContentType('discover').name('About ASAP');

  discover
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

  discover
    .createField('cnsQuestMembers')
    .name('CNS Quest Members')
    .type('Array')
    .localized(false)
    .required(false)
    .validations([])
    .disabled(false)
    .omitted(false)
    .items({
      type: 'Link',
      validations: [{ linkContentType: ['users'] }],
      linkType: 'Entry',
    });

  discover.changeFieldControl('asapAreas', 'builtin', 'entryLinksEditor', {
    helpText: 'Drag to change the order the areas are shown on the About ASAP page.',
    bulkEditing: false,
    showLinkEntityAction: true,
    showCreateEntityAction: false,
  });

  discover.changeFieldControl(
    'cnsQuestMembers',
    'builtin',
    'entryLinksEditor',
    {
      bulkEditing: false,
      showLinkEntityAction: true,
      showCreateEntityAction: false,
    },
  );
};

module.exports.down = (migration) => {
  const discover = migration.editContentType('discover').name('Discover ASAP');
  discover.deleteField('asapAreas');
  discover.deleteField('cnsQuestMembers');
};
