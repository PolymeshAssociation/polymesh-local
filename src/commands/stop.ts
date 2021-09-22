import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
import compose from 'docker-compose';

import { cleanUp, containerTime, stopContainers } from '../common/containers';
import { getMetadata, writeMetadata } from '../common/snapshots';
import { localDir } from '../consts';

export default class Stop extends Command {
  static description = 'Stops all services started with the "start" command';

  static usage = 'stop [OPTIONS]';

  static flags = {
    verbose: flags.boolean({
      description: 'enables verbose output',
      default: false,
    }),
    clean: flags.boolean({
      char: 'c',
      description: 'Cleans state after stopping',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags: commandFlags } = this.parse(Stop);
    const { verbose, clean } = commandFlags;
    const ps = await compose.ps({
      cwd: localDir,
      log: verbose,
    });

    if (ps.data.services.length === 0) {
      this.error('No containers to stop. Did you forget to run the "start" command?');
    }

    cli.action.start('Updating metadata');
    const metadata = getMetadata();
    metadata.time = containerTime(metadata);
    writeMetadata(metadata);
    cli.action.stop();

    cli.action.start('Stopping all services');
    await stopContainers();
    cli.action.stop();

    if (clean) {
      cli.action.start('Removing old container state');
      cleanUp();
      cli.action.stop();
    }

    this.log('Bye!');
  }
}
