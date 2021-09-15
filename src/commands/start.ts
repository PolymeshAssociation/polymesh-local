import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
import compose from 'docker-compose';

import { isChainUp, loadSnapshot } from '../common/chain';
import { stopContainers } from '../common/containers';
import { isSubqueryUp } from '../common/subquery';
import { isToolingUp } from '../common/tooling';
import { chain, postgres, publicPath, tooling } from '../consts';

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
  };

  async run(): Promise<void> {
    const { flags: commandFlags } = this.parse(Start);
    const { version, snapshot } = commandFlags;

    cli.action.start(`Unzipping chain snapshot: ${snapshot || version}`);
    await loadSnapshot(snapshot || version);
    cli.action.stop();

    cli.action.start('Starting the containers');
    await compose.upAll({
      cwd: publicPath,
      log: true,
      env: {
        POLYMESH_VERSION: version,
        SNAPSHOT_PATH: chain.chainsDir,
        PG_USER: postgres.user,
        PG_HOST: postgres.host,
        PG_PASSWORD: postgres.password,
        PG_PORT: postgres.port,
        PG_DB: postgres.db,
        ...process.env,
      },
    });
    cli.action.stop();

    cli.action.start('Checking service liveness');
    const [chainUp, toolingUp, subqueryUp] = await Promise.all([
      isChainUp(),
      isToolingUp(),
      isSubqueryUp(),
    ]);

    if (![chainUp, toolingUp, subqueryUp].every(Boolean)) {
      await stopContainers();
      this.error(
        `A service did not come up. Check results: ${JSON.stringify({
          chainUp,
          toolingUp,
          subqueryUp,
        })}. Inspect the logs to diagnose the problem`,
        { exit: 2 }
      );
    }
    // wait for the node to accept incoming connections
    cli.action.stop();

    this.log('\n');
    this.log(`polymesh node listening at wss://${chain.url}`);
    this.log(`postgreSQL listening at :${postgres.port}`);
    this.log(`tooling-gql listening at http://${tooling.url}`);
    this.log('happy testing!');
  }
}
