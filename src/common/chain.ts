import Command from '@oclif/command';
import { execSync } from 'child_process';
import fs from 'fs-extra';

import { chain } from '../../src/consts';
import { returnsExpectedStatus } from '../common/util';

export async function isChainUp(): Promise<boolean> {
  return returnsExpectedStatus(`http://${chain.url}`, 400);
}

export async function loadSnapshot(cmd: Command, snapshot: string): Promise<void> {
  const { dataDir, snapshotsDir } = chain;
  if (!fs.existsSync(snapshot)) {
    cmd.error(`Snapshot at ${snapshot} does not exist`);
  }

  if (fs.existsSync(dataDir)) {
    cmd.log(`Removing old chain data at ${dataDir}`);
    execSync(`rm -rf ${dataDir}`);
  }
  execSync('mkdir data', { cwd: snapshotsDir });
  execSync(`tar -xf ${snapshot} -C ./data`, { cwd: snapshotsDir });
}
