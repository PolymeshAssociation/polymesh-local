import { Command } from '@oclif/command';
import cli from 'cli-ux';
import { existsSync } from 'fs';

import { isChainUp } from '../common/chain';
import { containerTime, startContainers, stopContainers } from '../common/containers';
import { createSnapshot, getMetadata, snapshotPath, writeMetadata } from '../common/snapshots';
import { dataDir, snapshotsDir } from '../consts';
import { noData } from '../errors';

export default class Save extends Command {
  static description = 'Saves current chain state into an archive file';

  static usage = 'save [name]';

  static args = [
    {
      name: 'name',
      description: 'A name or path for the snapshot',
    },
  ];

  async run(): Promise<void> {
    const { args } = this.parse(Save);
    const output = args.name;

    if (!existsSync(dataDir)) {
      this.error(noData);
    }

    const metadata = getMetadata();
    const chainRunning = await isChainUp();
    if (chainRunning) {
      metadata.time = containerTime(metadata);
      cli.action.start('Pausing all services');
      writeMetadata(metadata);
      await stopContainers();
      cli.action.stop();
    }

    const fileName = output ? snapshotPath(output) : defaultFilename(metadata.version);
    cli.action.start(`Creating snapshot at: ${fileName}`);
    createSnapshot(fileName);
    cli.action.stop();

    if (chainRunning) {
      cli.action.start('Restarting containers');
      startContainers(metadata.version, metadata.time, false);
      metadata.startedAt = new Date().toISOString();
      writeMetadata(metadata);
      cli.action.stop();
    }
  }
}

function defaultFilename(version: string): string {
  return `${snapshotsDir}/${version}_${
    new Date().toISOString().replace('T', '_').split('.')[0]
  }.tgz`;
}
