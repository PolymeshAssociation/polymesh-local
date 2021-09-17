import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

import { chain } from '../../src/consts';
import { returnsExpectedStatus } from '../common/util';

export async function isChainUp(): Promise<boolean> {
  return await returnsExpectedStatus(`http://${chain.url}`, 400);
}

export async function loadSnapshot(snapshot: string): Promise<void> {
  if (!(await isChainUp())) {
    unzipSnapshot(snapshot);
  } else {
    console.log('chain node was running, skipping loading snapshot');
  }
}

function unzipSnapshot(snapshot: string): void {
  const snapshotPath = path.resolve(chain.snapshotsDir, `${snapshot}.tgz`);
  if (!fs.existsSync(snapshotPath) && !fs.existsSync(chain.dataDir)) {
    throw new Error(`snapshot at ${snapshotPath} does not exist`);
  }

  if (fs.existsSync(chain.dataDir)) {
    console.log(`removing old chain data at ${chain.dataDir}`);
    execSync(`rm -rf ${chain.dataDir}`);
  }
  execSync('mkdir data', { cwd: chain.snapshotsDir });
  execSync(`tar -xf ${snapshot}.tgz -C ./data`, { cwd: chain.snapshotsDir });
}
