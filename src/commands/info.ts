import { Command } from '@oclif/command';

import { printInfo } from '../common/util';

export default class Info extends Command {
  static description = 'prints service connection information';

  static usage = 'info';

  async run(): Promise<void> {
    printInfo(this);
  }
}
