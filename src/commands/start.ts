import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
import compose from 'docker-compose';
import fs from 'fs';

import { isChainUp, loadSnapshot } from '../common/chain';
import { prepareDockerfile, stopContainers } from '../common/containers';
import { isSubqueryUp } from '../common/subquery';
import { isToolingUp } from '../common/tooling';
import { printInfo, retry } from '../common/util';
import { chain, dockerPath, postgres } from '../consts';

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
    verbose: flags.boolean({
      description: 'enables verbose output',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags: commandFlags } = this.parse(Start);
    const { snapshot, verbose, version } = commandFlags;

    if (await isChainUp()) {
      this.error(
        `A running chain at ${chain.url} was detected. If you wish to start a new instance first use the "stop" command`
      );
    }

    const snapshotPath = snapshot || `${chain.snapshotsDir}/${version}.tgz`;
    cli.action.start(`Loading chain snapshot: ${snapshot || version}`);
    await loadSnapshot(this, snapshotPath);
    cli.action.stop();

    cli.action.start(`Preparing dockerfile for Polymesh version: ${version}`);
    prepareDockerfile(version);
    cli.action.stop();

    const faketime = fs.readFileSync(`${chain.snapshotsDir}/data/timestamp.txt`).toString();
    cli.action.start('Starting the containers');
    await compose.upAll({
      cwd: dockerPath,
      log: verbose,
      commandOptions: ['--build'],
      env: {
        ...process.env,
        POLYMESH_VERSION: version,
        DATA_DIR: chain.dataDir,
        PG_USER: postgres.user,
        PG_HOST: postgres.host,
        PG_PASSWORD: postgres.password,
        PG_PORT: postgres.port,
        PG_DB: postgres.db,
        FAKETIME: `@${faketime}`,
      },
    });
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
