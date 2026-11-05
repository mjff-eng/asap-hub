module.exports.description = 'Rename oldLabs field to labMemberships';

module.exports.up = (migration) => {
  const users = migration.editContentType('users');

  users.changeFieldId('oldLabs', 'labMemberships');
  users.editField('labMemberships', { name: 'Lab Memberships' });
};

module.exports.down = (migration) => {
  const users = migration.editContentType('users');

  users.changeFieldId('labMemberships', 'oldLabs');
  users.editField('oldLabs', { name: 'Old Labs' });
};
