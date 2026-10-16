module.exports.description = 'Add Grant PDF field to research outputs';

module.exports.up = (migration) => {
  const researchOutputs = migration.editContentType('researchOutputs');

  researchOutputs
    .createField('grantPdf')
    .name('Grant PDF')
    .type('Link')
    .localized(false)
    .required(false)
    .validations([
      {
        linkMimetypeGroup: ['pdfdocument'],
      },
    ])
    .disabled(false)
    .omitted(false)
    .linkType('Asset');

  researchOutputs.changeFieldControl('grantPdf', 'builtin', 'assetLinkEditor', {
    showLinkEntityAction: true,
    showCreateEntityAction: true,
    helpText: 'This field is required for Document Type of Grant Document only',
  });

  researchOutputs.moveField('grantPdf').afterField('link');
};

module.exports.down = (migration) => {
  const researchOutputs = migration.editContentType('researchOutputs');
  researchOutputs.deleteField('grantPdf');
};
