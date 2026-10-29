module.exports.description = 'Add start and end dates to lab membership';

module.exports.up = (migration) => {
  const labMembership = migration.editContentType('labMembership');

  labMembership
    .createField('startDate')
    .name('Start Date')
    .type('Date')
    .localized(false)
    .required(true)
    .validations([])
    .disabled(false)
    .omitted(false);

  labMembership
    .createField('endDate')
    .name('End Date')
    .type('Date')
    .localized(false)
    .required(false)
    .validations([])
    .disabled(false)
    .omitted(false);

  labMembership.changeFieldControl('startDate', 'builtin', 'datePicker', {
    format: 'dateonly',
    ampm: '24',
    helpText: 'The date the member joined the lab.',
  });

  labMembership.changeFieldControl('endDate', 'builtin', 'datePicker', {
    format: 'dateonly',
    ampm: '24',
    helpText:
      'The date the member left the lab. Leave empty while the member is still in the lab.',
  });

  labMembership.moveField('startDate').afterField('role');
  labMembership.moveField('endDate').afterField('startDate');
};

module.exports.down = (migration) => {
  const labMembership = migration.editContentType('labMembership');

  labMembership.deleteField('endDate');
  labMembership.deleteField('startDate');
};
