# Import data scripts

## Environment setup

The import scripts need to target the correct environment. Make sure to set the following environment variables:

```sh
CONTENTFUL_ACCESS_TOKEN
CONTENTFUL_ENV_ID
CONTENTFUL_SPACE_ID
```

### User import

To run the import script use this command from the root of this repository:

```bash
yarn import:users <file-path>
```

Where `<file-path>` is a relative path to the CSV file.

### Contributing Cohort import

To run the import script use this command from the root of this repository:

```bash
yarn import:cohorts <file-path>
```

Where `<file-path>` is a relative path to the CSV file.

### User invitations

To run the script use this command from the root of this repository.
This will re-trigger all invitations for users with an invitation code.
The invitation code will be re-generated:

```bash
yarn user:invitations
```

### Entity export

Exports an entity (`user`, `project`, `event`, `output`, `news`, `external-user`, `working-group`) to a file. The default format is JSON; `csv` writes a flat table with one row per record.

```bash
yarn workspace @asap-hub/gp2-server export:entity user --format csv -f gp2-users.csv
```

Options:

- `--format json|csv` (default `json`)
- `-f, --filename` output path (default `<entity>.<format>`)
- `--includeHidden` include users with the `Hidden` role (user entity only)
- `--includeNotOnboarded` include users who have not completed onboarding (user entity only)

Each user row carries `role` and `onboarded` columns, so hidden and not-yet-onboarded users can be told apart in the export.

The same export can be run from GitHub Actions with the "Export GP2 Users" workflow (`on-demand-gp2-users-export.yml`), which uploads the file as a short-lived run artifact.
