// src/base.ts
import Command from '@oclif/command';

import { getUserConfig, saveUserConfig, UserConfig } from './common/util';
import { fiveOneZeroConfig } from './consts';

/**
 * A base class to encapsulate cross command concerns, such as loading configuration
 */
export default abstract class extends Command {
  protected userConfig: UserConfig;

  async init(): Promise<void> {
    const config = await getUserConfig(this);
    if (config) {
      this.userConfig = config;
    } else {
      this.log(
        'No configuration file was detected. Creating one with default values. Run the `configure` command to inspect and modify'
      );
      saveUserConfig(this, fiveOneZeroConfig);
      this.userConfig = fiveOneZeroConfig;
    }
  }
}
