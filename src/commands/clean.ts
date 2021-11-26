import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';

import { anyContainersUp, removeVolumes } from '../common/containers';
import { chainRunningError } from '../errors';

export default class Clean extends Command {
  static description =
    'Clean removes the chain data so the next start is starts at a genisis block. Services must be stopped for this command to work';

  static flags = {
    help: flags.help({ char: 'h' }),
    verbose: flags.boolean({
      default: false,
      description: 'enables verbose logging',
    }),
  };

  async run(): Promise<void> {
    const { flags: commandFlags } = this.parse(Clean);
    const { verbose } = commandFlags;

    if (await anyContainersUp(this, verbose)) {
      this.error(chainRunningError);
    }
    cli.action.start('Removing data directory');
    removeVolumes();
    cli.action.stop();
  }
}
