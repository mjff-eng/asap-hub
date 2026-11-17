module.exports.description = 'Create ASAP Areas content model';

const emailValidation = {
  regexp: {
    pattern: "^\\w[\\w.\\-+']*@([\\w-]+\\.)+[\\w-]+$",
  },
  message: 'Please enter a valid email address',
};

module.exports.up = (migration) => {
  const asapAreas = migration
    .createContentType('asapAreas')
    .name('ASAP Areas')
    .description('')
    .displayField('name');

  asapAreas
    .createField('name')
    .name('Name')
    .type('Symbol')
    .localized(false)
    .required(true)
    .validations([{ unique: true }])
    .disabled(false)
    .omitted(false);

  asapAreas
    .createField('objective')
    .name('Objective')
    .type('Text')
    .localized(false)
    .required(true)
    .validations([])
    .disabled(false)
    .omitted(false);

  asapAreas
    .createField('primaryEmail')
    .name('Primary Email')
    .type('Symbol')
    .localized(false)
    .required(true)
    .validations([emailValidation])
    .disabled(false)
    .omitted(false);

  asapAreas
    .createField('secondaryEmail')
    .name('Secondary Email')
    .type('Symbol')
    .localized(false)
    .required(false)
    .validations([emailValidation])
    .disabled(false)
    .omitted(false);

  asapAreas
    .createField('members')
    .name('Members')
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

  asapAreas.changeFieldControl('objective', 'builtin', 'multipleLine', {});
  asapAreas.changeFieldControl('members', 'builtin', 'entryLinksEditor', {
    helpText:
      'Shows the Team ASAP members who have this area on their membership. Drag to change the order. To add or remove someone, edit their Team ASAP membership.',
    bulkEditing: false,
    showLinkEntityAction: true,
    showCreateEntityAction: false,
  });
};

module.exports.down = (migration) => {
  migration.deleteContentType('asapAreas');
};
