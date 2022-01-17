import { flags } from '@oclif/command';

import Command from '../base';
import { printInfo } from '../common/util';

export default class Info extends Command {
  static description = 'Prints service connection information';

  static usage = 'info';
  static flags = {
    help: flags.help({ char: 'h' }),
  };

  async run(): Promise<void> {
    this.parse(Info);
    printInfo(this);
  }
}
