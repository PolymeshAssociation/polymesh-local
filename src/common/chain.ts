import Command from '@oclif/command';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

import { chain, dataDir, snapshotsDir } from '../../src/consts';
import { returnsExpectedStatus } from '../common/util';

export async function isChainUp(): Promise<boolean> {
  return returnsExpectedStatus(`http://${chain.url}`, 400);
}

export async function loadSnapshot(cmd: Command, snapshot: string): Promise<void> {
  if (!existsSync(snapshot)) {
    cmd.error(`Snapshot at ${snapshot} does not exist`, { exit: 2 });
  }

  if (existsSync(dataDir)) {
    cmd.log(`Removing old chain data at ${dataDir}`);
    execSync(`rm -rf ${dataDir}`);
  }
  execSync(`mkdir -p ${dataDir}`);
  execSync(`tar -xf ${snapshot} -C ${dataDir}`, { cwd: snapshotsDir });
}
