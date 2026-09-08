module.exports.description =
  'Add ASAP Philosophy and Metric Definition fields for Team Metrics';

const TEAM_METRICS_NOTE =
  'Team Metrics: shown in the Awards section of the team Metrics tab.';

module.exports.up = (migration) => {
  const awardType = migration.editContentType('awardType');

  awardType
    .createField('asapPhilosophy')
    .name('ASAP Philosophy')
    .type('Text')
    .localized(false)
    .required(true)
    .validations([])
    .disabled(false)
    .omitted(false);

  awardType.changeFieldControl('asapPhilosophy', 'builtin', 'multipleLine', {
    helpText: TEAM_METRICS_NOTE,
  });

  awardType
    .createField('metricDefinition')
    .name('Metric Definition')
    .type('Text')
    .localized(false)
    .required(true)
    .validations([])
    .disabled(false)
    .omitted(false);

  awardType.changeFieldControl('metricDefinition', 'builtin', 'multipleLine', {
    helpText: TEAM_METRICS_NOTE,
  });
};

module.exports.down = (migration) => {
  const awardType = migration.editContentType('awardType');
  awardType.deleteField('asapPhilosophy');
  awardType.deleteField('metricDefinition');
};
