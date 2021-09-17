import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
import compose from 'docker-compose';
import fs from 'fs';

import { isChainUp, loadSnapshot } from '../common/chain';
import { prepareDockerfile, stopContainers } from '../common/containers';
import { isSubqueryUp } from '../common/subquery';
import { isToolingUp } from '../common/tooling';
import { retry } from '../common/util';
import { chain, dockerPath, postgres, tooling } from '../consts';

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
        'name of .tgz snapshot to use that is in the snapshots directory. defaults to version',
    }),
    noChecks: flags.boolean({
      char: 'n',
      description: 'skips service liveness checks',
      default: true,
    }),
    verbose: flags.boolean({
      description: 'enables verbose output',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags: commandFlags } = this.parse(Start);
    const { snapshot, noChecks, verbose, version } = commandFlags;

    if (!(await isChainUp())) {
      cli.action.start(`Unzipping chain snapshot: ${snapshot || version}`);
      await loadSnapshot(snapshot || version);
      cli.action.stop();

      cli.action.start(`Preparing dockerfile for Polymesh version: ${version}`);
      prepareDockerfile(version);
      cli.action.stop();
    } else {
      this.log('Detected chain already up. Skipping snapshot loading + Dockerfile preperation');
    }

    const faketime = fs.readFileSync(`${chain.snapshotsDir}/data/timestamp.txt`).toString();
    cli.action.start('Starting the containers');
    await compose.upAll({
      cwd: dockerPath,
      log: verbose,
      commandOptions: ['--build'],
      env: {
        POLYMESH_VERSION: version,
        DATA_DIR: chain.dataDir,
        PG_USER: postgres.user,
        PG_HOST: postgres.host,
        PG_PASSWORD: postgres.password,
        PG_PORT: postgres.port,
        PG_DB: postgres.db,
        FAKETIME: `@${faketime}`,
        ...process.env,
      },
    });
    cli.action.stop();

    if (noChecks) {
      cli.action.start('Checking service liveness');
      const checks = [isChainUp, isToolingUp, isSubqueryUp];
      const results = await Promise.all(checks.map(c => retry(c)));
      if (!results.every(Boolean)) {
        const resultMsgs = checks.map((c, i) => `${c.name}: ${results[i]}`);
        await stopContainers();
        this.error(
          `A service did not come up. Results: \n${resultMsgs.join(
            '\n'
          )}.\nInspect the docker logs to diagnose the problem`,
          { exit: 2 }
        );
      }
      cli.action.stop();
    }
    this.log('\n');
    this.log(`polymesh node listening at wss://${chain.url}`);
    this.log(`postgreSQL listening at :${postgres.port}`);
    this.log(`tooling-gql listening at http://${tooling.url}`);
    this.log('\n');
    this.log('Happy testing!');
  }
}
