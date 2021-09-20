import { execSync } from 'child_process';
import fs from 'fs-extra';

import { chain } from '../../src/consts';
import { returnsExpectedStatus } from '../common/util';

export async function isChainUp(): Promise<boolean> {
  return returnsExpectedStatus(`http://${chain.url}`, 400);
}

export async function loadSnapshot(snapshot: string): Promise<void> {
  const { dataDir, snapshotsDir } = chain;
  if (await isChainUp()) {
    console.log('Chain node was running, skipping loading snapshot');
  } else {
    if (!fs.existsSync(snapshot)) {
      throw new Error(`Snapshot at ${snapshot} does not exist`);
    }

    if (fs.existsSync(dataDir)) {
      console.log(`Removing old chain data at ${dataDir}`);
      execSync(`rm -rf ${dataDir}`);
    }
    execSync('mkdir data', { cwd: snapshotsDir });
    execSync(`tar -xf ${snapshot} -C ./data`, { cwd: snapshotsDir });
  }
}
