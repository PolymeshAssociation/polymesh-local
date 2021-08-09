import { Command } from '@oclif/command';
import cli from 'cli-ux';
import compose from 'docker-compose';

import { stopContainers } from '../common/containers';
import { publicPath } from '../consts';

export default class Stop extends Command {
  static description = 'stop all containers started with the "start" command';

  static usage = 'stop';

  async run(): Promise<void> {
    const ps = await compose.ps({
      cwd: publicPath,
      log: false,
    });

    if (ps.data.services.length === 0) {
      return this.error('no containers to stop. Did you forget to run the "start" command?');
    }

    cli.action.start('stopping all services');
    await stopContainers();
    cli.action.stop();

    this.log('bye!');
  }
}
