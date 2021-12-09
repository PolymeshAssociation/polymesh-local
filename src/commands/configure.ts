import { flags } from '@oclif/command';
import * as inquirer from 'inquirer';
import fetch from 'node-fetch';

import Command from '../base';
import { getUserConfig, saveUserConfig } from '../common/util';

export default class Info extends Command {
  static description = 'Helps create configuration for polymesh-local';

  static usage = 'configure';
  static flags = {
    help: flags.help({ char: 'h' }),
  };

  async run(): Promise<void> {
    const config = await getUserConfig(this);
    if (config) {
      this.log('Current configuration:');
      this.log(JSON.stringify(config, null, 2));
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
    } else {
      this.log('No previous configuration was detected');
    }

    const [restTags, subqueryTags, toolingTags] = await Promise.all([
      fetchDockerHubTags('polymathnet/polymesh-rest-api'),
      fetchDockerHubTags('polymathnet/polymesh-subquery'),
      fetchDockerHubTags('polymathnet/tooling-gql'),
    ]);
    const responses = await inquirer.prompt([
      {
        name: 'chain',
        message: 'Select chain version',
        type: 'list',
        choices: [{ name: '4.0.0' }, { name: '4.1.0-rc' }],
      },
      {
        name: 'restTag',
        message: 'Select rest api version',
        type: 'list',
        choices: restTags,
      },
      {
        name: 'subqueryTag',
        message: 'Select subquery version',
        type: 'list',
        choices: subqueryTags,
      },
      {
        name: 'toolingTag',
        message: 'Select tooling version',
        type: 'list',
        choices: toolingTags,
      },
      {
        name: 'restDids',
        type: 'input',
        default: '0x0600000000000000000000000000000000000000000000000000000000000000',
        message:
          'Please enter a comma separated list of the DIDs you want to use with the REST API',
        validate: (input: string) => {
          return validateDids(input);
        },
      },
      {
        name: 'restMnemonics',
        type: 'input',
        default: '//Alice',
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

function validateMnemonics(input: string, rawDids: string): boolean | string {
  const mnemonics = input.split(',');
  const dids = rawDids.split(',');
  if (mnemonics.length !== dids.length) {
    return `Each DID requires a mnemonic to be passed. Received ${mnemonics.length} mnemonics for ${dids.length} DIDs`;
  }
  for (let i = 0; i < mnemonics.length; i++) {
    const words = input.split(' ');
    if (words.length === 1 && words[0].match(/\/\/w+/)) continue; // i.e is shorthand mnemonic
    if (words.length !== 12) {
      return `Mnemonics should be 12 words separated by spaces. ${mnemonics[i]} did not meet this rule`;
    }
  }
  return true;
}

const didRegex = /0x[0-9a-z]{64}/;
function validateDids(input: string): boolean | string {
  const dids = input.split(',');
  for (let i = 0; i < dids.length; i++) {
    const did = dids[i];
    if (!did.match(didRegex)) {
      return 'DIDs should be 64 hex characters prefixed with 0x';
    }
  }
  return true;
}

interface DockerTag {
  name: string;
}

interface DockerTagResponse {
  next?: string;
  results: DockerTag[];
}
/**
 * Fetches docker hub tags for a given repo
 * @param repo The repo to fetch tags for
 * @returns available tags sorted by most recent first
 */
async function fetchDockerHubTags(repo: string): Promise<DockerTag[]> {
  const options = [];
  let response: DockerTagResponse = { results: [] };
  do {
    const url =
      response?.next ||
      `https://registry.hub.docker.com/v2/repositories/${repo}/tags/?${new URLSearchParams({
        page_size: '100',
      })}`;
    const rawResponse = await fetch(url);
    response = await rawResponse.json();
    options.push(
      ...response.results.map(r => {
        return { name: r.name };
      })
    );
  } while (response?.next);

  return options;
}
