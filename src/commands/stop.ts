import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';

import { anyContainersUp, removeVolumes, stopContainers } from '../common/containers';
import { getMetadata, writeMetadata } from '../common/snapshots';
import { containerNow } from '../common/util';

export default class Stop extends Command {
  static description = 'Stops all services started with the "start" command';

  static usage = 'stop [OPTIONS]';

  static flags = {
    help: flags.help({ char: 'h' }),
    clean: flags.boolean({
      char: 'c',
      description: 'Cleans state after stopping',
      default: false,
    }),
    verbose: flags.boolean({
      description: 'enables verbose logging',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags: commandFlags } = this.parse(Stop);
    const { clean, verbose } = commandFlags;

    if (!(await anyContainersUp(this, verbose))) {
      this.error('No containers to stop. Did you forget to run the "start" command?');
    }

    if (!clean) {
      cli.action.start('Updating metadata');
      const metadata = getMetadata();
      metadata.time = containerNow(metadata);
      writeMetadata(metadata);
      cli.action.stop();
    }

    cli.action.start('Stopping all services');
    await stopContainers(this, verbose);
    cli.action.stop();

    if (clean) {
      cli.action.start('Removing old container state');
      removeVolumes();
      cli.action.stop();
    }

    this.log('Bye!');
  }
}
