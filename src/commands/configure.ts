import { flags } from '@oclif/command';
import * as inquirer from 'inquirer';

import Command from '../base';
import { validateMnemonics } from '../common/rest';
import { fetchDockerHubTags, saveUserConfig } from '../common/util';
import { bundledConfig, supportedChainVersions, v5Config } from '../consts';

export default class Configure extends Command {
  static description = 'Manages the configuration file for polymesh-local';

  static usage = 'configure';
  static flags = {
    help: flags.help({ char: 'h' }),
  };

  async run(): Promise<void> {
    this.log('Current configuration:');
    this.log(JSON.stringify(this.userConfig, null, 2));
    const { configure } = await inquirer.prompt([
      {
        name: 'configure',
        type: 'confirm',
        default: false,
        message: 'Do you want to reconfigure polymesh-local?',
      },
    ]);
    if (!configure) {
      return;
    }

    const { preset } = await inquirer.prompt([
      {
        name: 'preset',
        message:
          'Select a chain version. Select `Custom` if you are advanced and want a specific combination of services',
        type: 'list',
        default: v5Config.chainTag,
        choices: [...bundledConfig.map(({ chainTag }) => chainTag), 'Custom'],
      },
    ]);
    if (preset !== 'Custom') {
      const choice = bundledConfig.find(({ chainTag }) => chainTag === preset);
      if (!choice) {
        this.error(`The selected choice ${choice} was not found. Please report this error`);
      }
      this.log('Updating configuration with: ', JSON.stringify(choice, undefined, 2));
      saveUserConfig(this, choice);
      return;
    }

    const [restTags, subqueryTags, toolingTags] = await Promise.all([
      fetchDockerHubTags('polymathnet/polymesh-rest-api'),
      fetchDockerHubTags('polymathnet/polymesh-subquery'),
      fetchDockerHubTags('polymathnet/tooling-gql'),
    ]);

    const responses = await inquirer.prompt([
      {
        name: 'chainTag',
        message: 'Select chain version',
        type: 'list',
        default: this.userConfig.chainTag,
        choices: supportedChainVersions.map(v => ({ name: v })),
      },
      {
        name: 'restTag',
        message: 'Select rest api version',
        type: 'list',
        default: this.userConfig.restTag,
        choices: restTags,
      },
      {
        name: 'subqueryTag',
        message: 'Select subquery version',
        type: 'list',
        default: this.userConfig.subqueryTag,
        choices: subqueryTags,
      },
      {
        name: 'toolingTag',
        message: 'Select tooling version',
        type: 'list',
        default: this.userConfig.toolingTag,
        choices: toolingTags,
      },
      {
        name: 'restSigners',
        type: 'input',
        default: this.userConfig.restSigners || 'alice',
        message:
          'Please enter a comma separated list of the strings you want to use to identify signers in the REST API',
      },
      {
        name: 'restMnemonics',
        type: 'input',
        default: this.userConfig.restMnemonics || '//Alice',
        message:
          'Please enter a comma separated list of mnemonics. Provide one for each DID in the same order',
        validate: (input: string, answers) => {
          return validateMnemonics(input, answers.restSigners);
        },
      },
    ]);

    saveUserConfig(this, responses);
  }
}
