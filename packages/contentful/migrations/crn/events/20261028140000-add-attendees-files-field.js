module.exports.description = 'Add attendees files field to events';

module.exports.up = (migration) => {
  const events = migration.editContentType('events');

  events
    .createField('attendeesFiles')
    .name('Attendees file(s)')
    .type('Array')
    .localized(false)
    .required(false)
    .disabled(false)
    .omitted(false)
    .items({
      type: 'Link',
      validations: [],
      linkType: 'Asset',
    });

  events.moveField('attendeesFiles').afterField('attendance');
};

module.exports.down = (migration) => {
  const events = migration.editContentType('events');
  events.deleteField('attendeesFiles');
};
