module.exports.description = 'Add CRN Calendar and Seminar Series fields';

module.exports.up = (migration) => {
  const calendars = migration.editContentType('calendars');

  calendars
    .createField('crnCalendar')
    .name('CRN Calendar')
    .type('Boolean')
    .localized(false)
    .required(false)
    .validations([])
    .defaultValue({
      'en-US': false,
    })
    .disabled(false)
    .omitted(false);

  calendars
    .createField('seminarSeries')
    .name('Seminar Series')
    .type('Boolean')
    .localized(false)
    .required(false)
    .validations([])
    .defaultValue({
      'en-US': false,
    })
    .disabled(false)
    .omitted(false);

  calendars.changeFieldControl('crnCalendar', 'builtin', 'boolean', {});
  calendars.changeFieldControl('seminarSeries', 'builtin', 'boolean', {});
};

module.exports.down = (migration) => {
  const calendars = migration.editContentType('calendars');

  calendars.deleteField('crnCalendar');
  calendars.deleteField('seminarSeries');
};
