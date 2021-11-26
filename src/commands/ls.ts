import { Command, flags } from '@oclif/command';

import { listSnapshots } from '../common/snapshots';

export default class Ls extends Command {
  static description = 'Lists current snapshots';

  static flags = {
    help: flags.help({ char: 'h' }),
  };

  async run(): Promise<void> {
    this.parse(Ls);
    listSnapshots(this);
  }
}
