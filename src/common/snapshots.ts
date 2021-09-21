import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

import { dataDir, snapshotsDir } from '../consts';

interface Metadata {
  version: string;
  time: string;
}

export function createSnapshot(fileName: string): void {
  execSync(`tar -czvf ${fileName} ${dataDir}`, { stdio: 'ignore' });
}

export function writeMetadata(data: Metadata): void {
  execSync(`mkdir -p ${dataDir}`);
  writeFileSync(`${dataDir}/metadata.json`, JSON.stringify(data));
}

export function unzipSnapshot(snapshot: string): void {
  const snapshotPath = path.resolve(snapshotsDir, `${snapshot}`);
  if (!existsSync(snapshotPath) && !existsSync(dataDir)) {
    throw new Error(`snapshot at ${snapshotPath} does not exist`);
  }

  if (existsSync(dataDir)) {
    console.log(`removing old chain data at ${dataDir}`);
    execSync(`rm -rf ${dataDir}`);
  }
  execSync(`mkdir -p ${dataDir}`);
  execSync(`tar -xf ${snapshot} -C .`, { cwd: dataDir });
}

export function getMetadata(): Metadata {
  const data = readFileSync(`${dataDir}/metadata.json`).toString();
  return JSON.parse(data) as Metadata;
}
