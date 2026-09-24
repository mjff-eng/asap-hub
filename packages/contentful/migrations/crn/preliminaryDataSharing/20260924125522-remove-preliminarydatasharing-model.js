module.exports.description =
  'Remove the legacy preliminary data sharing model and delete existing entries';

const CONTENT_TYPE = 'preliminaryDataSharing';
const PAGE_SIZE = 100;

const deleteEntry = async (makeRequest, entry) => {
  const { id, version, publishedVersion } = entry.sys;
  let currentVersion = version;

  if (publishedVersion) {
    const unpublished = await makeRequest({
      method: 'DELETE',
      url: `/entries/${id}/published`,
      headers: { 'X-Contentful-Version': currentVersion },
    });
    currentVersion = unpublished.sys.version;
  }

  await makeRequest({
    method: 'DELETE',
    url: `/entries/${id}`,
    headers: { 'X-Contentful-Version': currentVersion },
  });
};

// Deleting shrinks the collection, so keep reading the first page until it
// comes back empty. Requests are throttled by the migration runner.
const deleteEntries = async (makeRequest) => {
  const { items } = await makeRequest({
    method: 'GET',
    url: `/entries?content_type=${CONTENT_TYPE}&limit=${PAGE_SIZE}`,
  });

  if (items.length === 0) {
    return;
  }

  await Promise.all(items.map((entry) => deleteEntry(makeRequest, entry)));
  await deleteEntries(makeRequest);
};

module.exports.up = async (migration, { makeRequest }) => {
  await deleteEntries(makeRequest);
  migration.deleteContentType(CONTENT_TYPE);
};

module.exports.down = (migration) => {
  const preliminaryDataSharing = migration
    .createContentType(CONTENT_TYPE)
    .name('Preliminary Data Sharing')
    .description('');

  preliminaryDataSharing
    .createField('team')
    .name('Team')
    .type('Link')
    .localized(false)
    .required(true)
    .validations([
      {
        linkContentType: ['teams'],
      },
    ])
    .disabled(false)
    .omitted(false)
    .linkType('Entry');

  preliminaryDataSharing
    .createField('preliminaryDataShared')
    .name('Preliminary Data Shared')
    .type('Boolean')
    .localized(false)
    .required(true)
    .validations([])
    .disabled(false)
    .omitted(false);

  preliminaryDataSharing.changeFieldControl(
    'team',
    'builtin',
    'entryLinkEditor',
    {
      showLinkEntityAction: true,
      showCreateEntityAction: false,
    },
  );

  preliminaryDataSharing.changeFieldControl(
    'preliminaryDataShared',
    'builtin',
    'boolean',
    {},
  );
};
