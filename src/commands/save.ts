import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';

import { containerTime, startContainers, stopContainers } from '../common/containers';
import { createSnapshot, getMetadata, writeMetadata } from '../common/snapshots';
import { docker, snapshotsDir } from '../consts';

export default class Save extends Command {
  static description = 'saves current chain state into a tarball';

  static usage = 'save ';

  static flags = {
    output: flags.string({
      char: 'o',
      description: 'File path for the created snapshot',
    }),
  };

  async run(): Promise<void> {
    const { flags: commandFlags } = this.parse(Save);
    const { output } = commandFlags;

    const metadata = getMetadata();
    metadata.time = containerTime(docker.execContainer);
    cli.action.start('Preparing to create snapshot');
    writeMetadata(metadata);
    cli.action.stop();

    cli.action.start('Pausing all services');
    await stopContainers();
    cli.action.stop();

    const fileName = output ? outputPath(output) : defaultFilename(metadata.version);
    cli.action.start(`Creating snapshot at: ${fileName}`);
    createSnapshot(fileName);
    cli.action.stop();

    cli.action.start('Restarting containers');
    startContainers(metadata.version, metadata.time, false);
    cli.action.stop();
  }
}

function defaultFilename(version: string): string {
  return `${snapshotsDir}/v${version}_${new Date().toISOString().replace('T', '_').split('.')[0]}`;
}

function outputPath(output: string): string {
  if (output && !output.endsWith('.tgz')) {
    return `${output}.tgz`;
  }
  return output;
}
