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
export function validateMnemonics(input: string, rawDids: string): boolean | string {
  const mnemonics = input.split(',');
  const dids = rawDids.split(',');
  if (mnemonics.length !== dids.length) {
    return `Each DID requires a mnemonic to be passed. Received ${mnemonics.length} mnemonics for ${dids.length} DIDs`;
  }
  for (let i = 0; i < mnemonics.length; i++) {
    const words = input.split(' ');
    if (words.length === 1 && words[0].match(/\/\/\w+/)) continue; // i.e is shorthand mnemonic
    if (words.length !== 12) {
      return `Mnemonics should be 12 words separated by spaces or a shorthand like //Alice. ${mnemonics[i]} did not meet this rule`;
    }
  }
  return true;
}

const didRegex = /0x[0-9a-z]{64}/;
/**
 * Validates user inputted DIDs in accordance to inquisitors validation interface
 * @returns true if input is valid otherwise returns string describing the issue
 */
export function validateDids(input: string): boolean | string {
  const dids = input.split(',');
  for (let i = 0; i < dids.length; i++) {
    const did = dids[i];
    if (!did.match(didRegex)) {
      return 'DIDs should be 64 hex characters prefixed with 0x';
    }
  }
  return true;
}

/**
 * extracts the dids and mnemonics from the rest api so that it can be restarted during `save()
 * @returns {Promise<[string, string]>}
 */
export async function getRelayerEnvs(cmd: Command, verbose: boolean): Promise<[string, string]> {
  if ((await containersUp(cmd, verbose)).includes('rest_api')) {
    const restContainer = await containerName(cmd, 'rest_api');
    const dids = getContainerEnv(restContainer, 'RELAYER_DIDS');
    const mnemonics = getContainerEnv(restContainer, 'RELAYER_MNEMONICS');
    return [dids, mnemonics];
  } else {
    return ['', ''];
  }
}
