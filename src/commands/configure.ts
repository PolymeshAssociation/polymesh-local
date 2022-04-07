import { flags } from '@oclif/command';
import * as inquirer from 'inquirer';

import Command from '../base';
import { validateMnemonics } from '../common/rest';
import { fetchDockerHubTags, saveUserConfig } from '../common/util';
import { defaultUserConfig, supportedChainVersions } from '../consts';

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

    this.log('Default config settings: ');
    this.log(JSON.stringify(defaultUserConfig, undefined, 2));
    const { useDefault } = await inquirer.prompt([
      {
        name: 'useDefault',
        type: 'confirm',
        default: !this.userConfig, // default to yes only if there is no config
        message: 'Do you want to use the default config?',
      },
    ]);
    if (useDefault) {
      saveUserConfig(this, defaultUserConfig);
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
          return validateMnemonics(input, answers.restDids);
        },
      },
    ]);

    saveUserConfig(this, responses);
  }
}
