import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
import { existsSync } from 'fs';

import { containersUp, startContainers, stopContainers } from '../common/containers';
import { getRelayerEnvs } from '../common/rest';
import { createSnapshot, getMetadata, snapshotPath, writeMetadata } from '../common/snapshots';
import { dataDir, snapshotsDir } from '../consts';
import { noData } from '../errors';

export default class Save extends Command {
  static description = 'Saves current chain state into an archive file';

  static hidden = true;

  static usage = 'save [name]';

  static flags = {
    iKnowWhatImDoing: flags.boolean({ default: false }),
    verbose: flags.boolean({
      description: 'enables verbose logging',
      default: false,
    }),
  };

  static args = [
    {
      name: 'name',
      description: 'A name or path for the snapshot',
    },
  ];

  async run(): Promise<void> {
    const { args, flags: commandFlags } = this.parse(Save);
    const { verbose, iKnowWhatImDoing } = commandFlags;
    const output = args.name;

    if (!iKnowWhatImDoing) {
      this.error(
        'When you load a saved snapshot, it will be read only, meaning no new blocks will be produced, to get rid of this message ' +
          'pass the --iKnowWhatImDoing flag'
      );
    }

    if (!existsSync(dataDir)) {
      this.error(noData);
    }

    const restEnvs = await getRelayerEnvs(this, verbose);
    const metadata = getMetadata();
    const services = await containersUp(this, verbose);
    if (services.length > 0) {
      cli.action.start('Pausing all services');
      writeMetadata(metadata);
      await stopContainers(this, verbose);
      cli.action.stop();
    }

    const fileName = output ? snapshotPath(output) : defaultFilename(metadata.version);
    cli.action.start(`Creating snapshot at: ${fileName}`);
    createSnapshot(fileName);
    cli.action.stop();

    if (services.length > 0) {
      cli.action.start('Restarting services');
      await startContainers(
        this,
        metadata.version,
        verbose,
        metadata.chain,
        services,
        restEnvs[0],
        restEnvs[1]
      );
      writeMetadata(metadata);
      cli.action.stop();
    }
  }
}

function defaultFilename(version: string): string {
  // strip the timezone so the file name looks cleaner. Replace `:` so the file name is valid on windows
  return `${snapshotsDir}/${version}_${
    new Date().toISOString().replace('T', '_').replace(/:/g, '-').split('.')[0]
  }.tgz`;
}
