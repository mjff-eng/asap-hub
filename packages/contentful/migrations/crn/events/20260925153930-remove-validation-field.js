module.exports.description = 'Remove speakers validation field';

module.exports.up = (migration) => {
  const events = migration.editContentType('events');
  events.deleteField('validation');
};

module.exports.down = (migration) => {
  const events = migration.editContentType('events');

  events
    .createField('validation')
    .name('Validation')
    .type('Symbol')
    .localized(false)
    .required(true)
    .validations([
      {
        in: ['true'],
      },
    ])
    .defaultValue({
      'en-US': 'true',
    })
    .disabled(false)
    .omitted(true);

  events.moveField('validation').afterField('speakers');

  events.changeFieldControl('validation', 'app', '2nWYJi9yK7A6WKwm9eezb', {});
};
