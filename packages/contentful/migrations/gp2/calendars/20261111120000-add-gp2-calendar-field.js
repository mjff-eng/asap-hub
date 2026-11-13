module.exports.description = 'Add GP2 Calendar field';

module.exports.up = (migration) => {
  const calendars = migration.editContentType('calendars');

  calendars
    .createField('gp2Calendar')
    .name('GP2 Calendar')
    .type('Boolean')
    .localized(false)
    .required(false)
    .validations([])
    .defaultValue({
      'en-US': false,
    })
    .disabled(false)
    .omitted(false);

  calendars.changeFieldControl('gp2Calendar', 'builtin', 'boolean', {});
};

module.exports.down = (migration) => {
  const calendars = migration.editContentType('calendars');

  calendars.deleteField('gp2Calendar');
};
