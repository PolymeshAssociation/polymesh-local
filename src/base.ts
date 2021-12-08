// src/base.ts
import Command from '@oclif/command';
import * as fs from 'fs-extra';
import path from 'path';

import { configFileName } from './consts';

/**
 * Values a user can set in a config file to control what images to use
 */
export interface UserConfig {
  // image versions
  chainTag: string;
  toolingTag: string;
  restTag: string;
  subqueryTag: string;

  restMnemonics: string;
  restDids: string;
}

/**
 * A base class to encapsulate cross command concerns, such as loading configuration
 */
export default abstract class extends Command {
  protected userConfig: UserConfig;

  async init(): Promise<void> {
    const configPath = path.join(this.config.configDir, configFileName);
    try {
      if (fs.existsSync(configPath)) {
        this.userConfig = await fs.readJSON(configPath);
      }
    } catch (err) {
      this.error(`Could not open config file: ${err}`);
    }
  }
}
