import { Command } from '@oclif/command';
import { cli } from 'cli-ux';

import { anyContainersUp, removeVolumes } from '../common/containers';
import { chainRunningError } from '../errors';

export default class Clean extends Command {
  static description =
    'Clean removes the chain data so the next start is starts at a genisis block. Services must be stopped for this command to work';

  async run(): Promise<void> {
    if (await anyContainersUp(this)) {
      this.error(chainRunningError);
    }
    cli.action.start('Removing data directory');
    removeVolumes();
    cli.action.stop();
  }
}
