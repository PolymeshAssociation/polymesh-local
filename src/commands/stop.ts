import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
import compose from 'docker-compose';

import { cleanUp, stopContainers } from '../common/containers';
import { localDir } from '../consts';

export default class Stop extends Command {
  static description = 'stop all containers started with the "start" command';

  static usage = 'stop [OPTIONS]';

  static flags = {
    verbose: flags.boolean({
      description: 'enables verbose output',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags: commandFlags } = this.parse(Stop);
    const { verbose } = commandFlags;
    const ps = await compose.ps({
      cwd: localDir,
      log: verbose,
    });

    if (ps.data.services.length === 0) {
      this.error('No containers to stop. Did you forget to run the "start" command?');
    }

    cli.action.start('Stopping all services');
    await stopContainers();
    cli.action.stop();

    cli.action.start('Cleaning up chain data');
    cleanUp();
    cli.action.stop();

    this.log('Bye!');
  }
}
