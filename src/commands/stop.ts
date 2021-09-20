import { Command, flags } from '@oclif/command';
import { execSync } from 'child_process';
import cli from 'cli-ux';
import compose from 'docker-compose';
import fs from 'fs-extra';

import { stopContainers } from '../common/containers';
import { chain, dockerPath } from '../consts';

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
      cwd: dockerPath,
      log: verbose,
    });

    if (ps.data.services.length === 0) {
      return this.error('No containers to stop. Did you forget to run the "start" command?');
    }

    cli.action.start('Stopping all services');
    await stopContainers();
    cli.action.stop();

    const { dataDir } = chain;
    cli.action.start(`Removing chain data at ${dataDir}`);
    if (fs.existsSync(dataDir)) {
      execSync(`rm -r ${dataDir}`);
    }
    cli.action.stop();

    this.log('Bye!');
  }
}
