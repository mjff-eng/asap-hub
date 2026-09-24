/* istanbul ignore file */
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { ExportFormat, exportEntity, exportFormats } from './export-entity';

type Entity =
  | 'output'
  | 'project'
  | 'event'
  | 'user'
  | 'news'
  | 'external-user'
  | 'working-group';

// eslint-disable-next-line no-unused-expressions
yargs(hideBin(process.argv))
  .command<{
    entity: string;
    filename: string | undefined;
    format: string;
    includeHidden: boolean;
    includeNotOnboarded: boolean;
  }>({
    command: 'export <entity>',
    describe: 'export entity data to JSON or CSV',
    builder: (cli) =>
      cli
        .positional('entity', {
          describe: 'specific an entity to import',
          type: 'string',
          choices: [
            'output',
            'project',
            'event',
            'user',
            'news',
            'external-user',
            'working-group',
          ],
          demandOption: true,
        })
        .option('filename', {
          alias: 'f',
          type: 'string',
          description: 'The output file name',
        })
        .option('format', {
          type: 'string',
          choices: exportFormats,
          default: 'json',
          description: 'The output format',
        })
        .option('includeHidden', {
          type: 'boolean',
          default: false,
          description: 'Include users with the Hidden role (user entity only)',
        })
        .option('includeNotOnboarded', {
          type: 'boolean',
          default: false,
          description:
            'Include users who have not completed onboarding (user entity only)',
        }),
    handler: async ({
      entity,
      filename,
      format,
      includeHidden,
      includeNotOnboarded,
    }) =>
      exportEntity(entity as Entity, {
        filename,
        format: format as ExportFormat,
        includeHidden,
        includeNotOnboarded,
      }),
  })
  .demandCommand(1)
  .help('h')
  .alias('h', 'help')
  .completion()
  .strict().argv;
