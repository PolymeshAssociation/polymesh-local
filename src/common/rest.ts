import Command from '@oclif/command';

import { containerName, containersUp, getContainerEnv } from '../common/containers';
import { returnsExpectedStatus } from '../common/util';
import { rest } from '../consts';

export async function isRestUp(): Promise<boolean> {
  return returnsExpectedStatus(`http://${rest.url}`, 200);
}

export function validateDidArgs(dids: string, mnemonics: string): boolean {
  return dids.split(',').length === mnemonics.split(',').length;
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
