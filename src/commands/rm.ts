import { Command } from '@oclif/command';

import { removeSnapshot, snapshotPath } from '../common/snapshots';

export default class Rm extends Command {
  static description = 'Removes a snapshot';

  static args = [{ name: 'file', required: true }];

  async run(): Promise<void> {
    const { args } = this.parse(Rm);
    removeSnapshot(this, snapshotPath(args.file));
  }
}
