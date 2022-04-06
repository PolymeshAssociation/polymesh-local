import Command from '@oclif/command';

import { containerName, containersUp, getContainerEnv } from '../common/containers';
import { returnsExpectedStatus } from '../common/util';
import { rest } from '../consts';

export async function isRestUp(): Promise<boolean> {
  return returnsExpectedStatus(`http://${rest.url}`, 200);
}

/**
 * Validates user inputted mnemonics in accordance to inquisitors validation interface
 * @returns true if input is valid otherwise returns a string describing the issue
 */
export function validateMnemonics(input: string, rawSigners: string): boolean | string {
  const mnemonics = input.split(',').map(m => m.trim());
  const signers = rawSigners.split(',').map(d => d.trim());
  if (mnemonics.length !== signers.length) {
    return `Each signer requires a mnemonic to be passed. Received ${mnemonics.length} mnemonics for ${signers.length} signers`;
  }

  const errors: string[] = [];
  for (const mnemonic of mnemonics) {
    const words = mnemonic.split(' ');
    if (words.length === 1 && words[0].match(/\/\/\w+/)) continue; // i.e is shorthand mnemonic
    if (words.length !== 12) {
      errors.push(
        `Mnemonic "${mnemonic}" is not valid. Mnemonics should be 12 words separated by spaces or a shorthand like //Alice`
      );
    }
  }
  return errors.length ? errors.join('\n') : true;
}

/**
 * extracts the signers with their mnemonics from the rest api so that it can be restarted during `save()
 * @returns {Promise<[string, string]>}
 */
export async function getRestEnv(
  cmd: Command,
  verbose: boolean
): Promise<[string, string, string, string]> {
  if ((await containersUp(cmd, verbose)).includes('rest_api')) {
    const restContainer = await containerName(cmd, 'rest_api');
    const signers = getContainerEnv(restContainer, 'LOCAL_SIGNERS');
    const mnemonics = getContainerEnv(restContainer, 'LOCAL_MNEMONICS');
    const vaultUrl = getContainerEnv(restContainer, 'VAULT_URL');
    const vaultToken = getContainerEnv(restContainer, 'VAULT_TOKEN');
    return [signers, mnemonics, vaultUrl, vaultToken];
  } else {
    return ['', '', '', ''];
  }
}
