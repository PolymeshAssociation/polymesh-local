import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';

import { isChainUp, loadSnapshot } from '../common/chain';
import { prepareDockerfile, startContainers, stopContainers } from '../common/containers';
import { getMetadata, writeMetadata } from '../common/snapshots';
import { isSubqueryUp } from '../common/subquery';
import { isToolingUp } from '../common/tooling';
import { hostTime, printInfo, retry } from '../common/util';
import { chain, snapshotsDir } from '../consts';

export default class Start extends Command {
  static description = 'start all containers';

  static usage = 'start [OPTIONS]';

  static flags = {
    help: flags.help({ char: 'h' }),
    version: flags.string({
      char: 'v',
      default: '3.2.0',
      description: 'version of the containers to run',
      options: ['3.2.0'],
    }),
    snapshot: flags.string({
      char: 's',
      description:
        'path to the snapshot to use. If no file is passed, the default snapshot for the selected version is used',
    }),
    cleanStart: flags.boolean({
      char: 'c',
      description: 'Brings up a fresh environment with no data. Skips the snapshot importing step',
      default: false,
    }),
    verbose: flags.boolean({
      description: 'enables verbose output',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags: commandFlags } = this.parse(Start);
    const { snapshot, verbose, version, cleanStart } = commandFlags;

    if (await isChainUp()) {
      this.error(
        `A running chain at ${chain.url} was detected. If you wish to start a new instance first use the "stop" command`
      );
    }

    let metadata;
    if (!cleanStart) {
      const snapshotPath = snapshot || `${snapshotsDir}/${version}.tgz`;
      cli.action.start(`Loading chain snapshot: ${snapshotPath}`);
      await loadSnapshot(this, snapshotPath);
      cli.action.stop();
      metadata = getMetadata();
    } else {
      metadata = {
        version,
        time: hostTime(),
      };
      writeMetadata(metadata);
    }

    cli.action.start(`Preparing dockerfile for Polymesh version: ${version}`);
    prepareDockerfile(version);
    cli.action.stop();

    cli.action.start('Starting the containers');
    startContainers(version, metadata.time, verbose);
    cli.action.stop();

    cli.action.start('Checking service liveness');
    const checks = [isChainUp, isToolingUp, isSubqueryUp];
    const results = await Promise.all(checks.map(c => retry(c)));
    if (!results.every(Boolean)) {
      const resultMsgs = checks.map((c, i) => `${c.name}: ${results[i]}`);
      await stopContainers();
      this.error(
        `At least one of the required services did not launch correctly. Results: \n${resultMsgs.join(
          '\n'
        )}.\nInspect the docker logs to diagnose the problem`,
        { exit: 2 }
      );
    }
    cli.action.stop();
    this.log(); // implicit newline
    printInfo(this);
    this.log('\nHappy testing!');
  }
}
