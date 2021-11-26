import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';

import { anyContainersUp } from '../common/containers';
import { loadSnapshot } from '../common/snapshots';
import { chainRunningError } from '../errors';

export default class Load extends Command {
  static description =
    'Loads a snapshot into the data directory. Services must be stopped for this command to work';

  static args = [{ name: 'file', required: true }];
  static flags = {
    help: flags.help({ char: 'h' }),
    verbose: flags.boolean({
      default: false,
      description: 'enables verbose logging',
    }),
  };

  async run(): Promise<void> {
    const { args, flags: commandFlags } = this.parse(Load);
    const { verbose } = commandFlags;
    if (await anyContainersUp(this, verbose)) {
      this.error(chainRunningError);
    }

    cli.action.start('Loading snapshot');
    loadSnapshot(this, args.file);
    cli.action.stop();
  }
}
