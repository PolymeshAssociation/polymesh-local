// src/base.ts
import Command from '@oclif/command';

import { getUserConfig, UserConfig } from './common/util';

/**
 * A base class to encapsulate cross command concerns, such as loading configuration
 */
export default abstract class extends Command {
  protected userConfig: UserConfig | null;

  async init(): Promise<void> {
    this.userConfig = await getUserConfig(this);
  }
}
