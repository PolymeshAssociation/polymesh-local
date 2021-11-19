import { Command } from '@oclif/command';
import { cli } from 'cli-ux';

import { anyContainersUp } from '../common/containers';
import { loadSnapshot } from '../common/snapshots';
import { chainRunningError } from '../errors';

export default class Load extends Command {
  static description =
    'Loads a snapshot into the data directory. Services must be stopped for this command to work';

  static args = [{ name: 'file', required: true }];

  async run(): Promise<void> {
    const { args } = this.parse(Load);
    if (await anyContainersUp(this)) {
      this.error(chainRunningError);
    }

    cli.action.start('Loading snapshot');
    loadSnapshot(this, args.file);
    cli.action.stop();
  }
}
