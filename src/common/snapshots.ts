import Command from '@oclif/command';
import { existsSync, lstatSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { mkdirpSync } from 'fs-extra';
import rimraf from 'rimraf';
import tar from 'tar';

import { backupVolumes, restoreVolumes } from '../common/containers';
import { dataDir, snapshotsDir } from '../consts';

// A snapshot is a collection of docker volumes for containers along with additional meta data.

export interface Metadata {
  version: string;
  // stopTimestamp represents the timestamp when the node was last stopped.
  stopTimestamp: number;
  // startedAt is a timestamp recorded when starting. Used to calculate time when shutting down.
  // libfaketime advances on a per process basis making it difficult to query directly form the container.
  chain: string;
}

export function createSnapshot(fileName: string): void {
  mkdirpSync(snapshotsDir);
  backupVolumes();
  tar.c(
    {
      gzip: true,
      file: fileName,
      C: dataDir,
    },
    ['.']
  );
}

export function writeMetadata(data: Metadata): void {
  mkdirpSync(dataDir);
  writeFileSync(`${dataDir}/metadata.json`, JSON.stringify(data));
}

export async function loadSnapshot(cmd: Command, snapshot: string): Promise<void> {
  const path = snapshotPath(snapshot);
  if (!existsSync(path)) {
    cmd.error(`Snapshot at ${snapshot} does not exist`, { exit: 2 });
  }

  if (existsSync(dataDir)) {
    cmd.log(`Removing old chain data at ${dataDir}`);
    rimraf.sync(dataDir);
  }
  mkdirpSync(dataDir);
  await tar.x({
    file: path,
    C: dataDir,
  });
  restoreVolumes();
}

export function getMetadata(): Metadata {
  const data = readFileSync(`${dataDir}/metadata.json`).toString();
  return JSON.parse(data) as Metadata;
}

export function listSnapshots(cmd: Command): void {
  mkdirpSync(snapshotsDir);
  const snapshots = readdirSync(snapshotsDir, { withFileTypes: true })
    .filter(dirent => dirent.isFile())
    .map(dirent => dirent.name.replace(/\.tgz/g, ''));
  cmd.log('Local snapshots:');
  cmd.log(snapshots.join('\n'));
}

export function removeSnapshot(cmd: Command, snapshot: string): void {
  if (!existsSync(snapshot)) {
    cmd.error(`${snapshot} does not exist`);
  }
  const stat = lstatSync(snapshot);
  if (!stat.isFile()) {
    cmd.error(`${snapshot} is not a file`);
  }
  rmSync(snapshotPath(snapshot));
}

export function snapshotPath(snapshot: string): string {
  if (snapshot.includes('/')) {
    return snapshot;
  } else {
    return `${snapshotsDir}/${snapshot}.tgz`;
  }
}
