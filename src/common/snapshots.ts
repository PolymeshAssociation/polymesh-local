import Command from '@oclif/command';
import { execSync } from 'child_process';
import { existsSync, lstatSync, readFileSync, writeFileSync } from 'fs';

import { dataDir, snapshotsDir } from '../consts';

export interface Metadata {
  version: string;
  time: string;
  startedAt: string;
}

export function createSnapshot(fileName: string): void {
  execSync(`tar -czvf ${fileName} -C ${dataDir} .`, { stdio: 'ignore' });
}

export function writeMetadata(data: Metadata): void {
  execSync(`mkdir -p ${dataDir}`);
  writeFileSync(`${dataDir}/metadata.json`, JSON.stringify(data));
}

export async function loadSnapshot(cmd: Command, snapshot: string): Promise<void> {
  const path = snapshotPath(snapshot);
  if (!existsSync(path)) {
    cmd.error(`Snapshot at ${snapshot} does not exist`, { exit: 2 });
  }

  if (existsSync(dataDir)) {
    cmd.log(`Removing old chain data at ${dataDir}`);
    execSync(`rm -rf ${dataDir}`);
  }
  execSync(`mkdir -p ${dataDir}`);
  execSync(`tar -xf ${path} -C ${dataDir}`);
}

export function getMetadata(): Metadata {
  const data = readFileSync(`${dataDir}/metadata.json`).toString();
  return JSON.parse(data) as Metadata;
}

export function listSnapshots(cmd: Command): void {
  const snapshots = execSync(`ls ${snapshotsDir}`).toString().replace(/\.tgz/g, '');
  cmd.log('Local snapshots: \n');
  cmd.log(snapshots);
}

export function removeSnapshot(cmd: Command, snapshot: string): void {
  if (!existsSync(snapshot)) {
    cmd.error(`${snapshot} does not exist`);
  }
  const stat = lstatSync(snapshot);
  if (!stat.isFile()) {
    cmd.error(`${snapshot} is not a file`);
  }
  execSync(`rm ${snapshotPath(snapshot)}`);
}

export function snapshotPath(snapshot: string): string {
  if (snapshot.includes('/')) {
    return snapshot;
  } else {
    return `${snapshotsDir}/${snapshot}.tgz`;
  }
}