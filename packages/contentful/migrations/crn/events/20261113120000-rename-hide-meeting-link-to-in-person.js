module.exports.description =
  'Rename hideMeetingLink to inPerson and default it to false';

module.exports.up = (migration) => {
  const events = migration.editContentType('events');

  // changeFieldId keeps the stored values. The meaning does not flip: a true
  // value already meant the event was in person.
  events.changeFieldId('hideMeetingLink', 'inPerson');

  events.editField('inPerson').name('In Person').required(true).defaultValue({
    'en-US': false,
  });

  events.changeFieldControl('inPerson', 'builtin', 'boolean', {
    helpText:
      'Shows the "In person" tag on the event and hides the meeting link. The Google Calendar sync does not change this value.',
    trueLabel: 'Yes',
    falseLabel: 'No',
  });
};

module.exports.down = (migration) => {
  const events = migration.editContentType('events');

  events.changeFieldId('inPerson', 'hideMeetingLink');

  // The false default is left in place: it matches the value the sync used
  // to send for new events.
  events.editField('hideMeetingLink').name('Hide Meeting Link');

  events.changeFieldControl('hideMeetingLink', 'builtin', 'boolean', {});
};
