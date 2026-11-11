module.exports.description = 'Remove unused tags field from research outputs';

module.exports.up = (migration) => {
  const researchOutputs = migration.editContentType('researchOutputs');

  researchOutputs.deleteField('tags');
};

module.exports.down = (migration) => {
  const researchOutputs = migration.editContentType('researchOutputs');

  researchOutputs
    .createField('tags')
    .name('Tags')
    .type('Array')
    .localized(false)
    .required(false)
    .validations([])
    .disabled(false)
    .omitted(false)
    .items({
      type: 'Symbol',
      validations: [],
    });

  researchOutputs.moveField('tags').afterField('keywords');
};
