import { Command } from '@oclif/command';

import { listSnapshots } from '../common/snapshots';

export default class Ls extends Command {
  static description = 'Lists current snapshots';

  async run(): Promise<void> {
    listSnapshots(this);
  }
}
