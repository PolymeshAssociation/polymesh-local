import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
import compose from 'docker-compose';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';

import { stopContainers } from '../common/containers';
import { chainNetworkData, publicPath, snapshotsPath } from '../consts';

export default class Start extends Command {
  static description = 'start all containers';

  static usage = 'start [OPTIONS]';

  static flags = {
    help: flags.help({ char: 'h' }),
    version: flags.string({
      char: 'v',
      default: '3.0.0',
      description: 'version of the containers to run',
    }),
    snapshot: flags.string({ char: 's', description: 'path to a custom snapshot file' }),
    timeout: flags.string({
      char: 't',
      default: '60',
      description:
        'maximum amount of seconds to wait for the local node to be able to receive connections',
    }),
  };

  async run(): Promise<void> {
    const iterations = 5;
    const { flags: commandFlags } = this.parse(Start);

    const { version, snapshot, timeout } = commandFlags;

    if (!version.match(/[0-9]+\.[0-9]+\.[0-9]+/)) {
      return this.error('"version" must be a semantic version string (i.e 3.1.2)', { exit: 2 });
    }

    const snapshotPath = snapshot || path.resolve(snapshotsPath, `${version}.json`);

    if (!fs.existsSync(snapshotPath)) {
      return this.error('"snapshot" file does not exist', { exit: 2 });
    }

    const seconds = Number(timeout);

    if (isNaN(seconds) || seconds < iterations) {
      return this.error(`"timeout" must be a number greater or equal than ${iterations}`, {
        exit: 2,
      });
    }

    cli.action.start('starting the polymesh container');
    await compose.upAll({
      cwd: publicPath,
      log: false,
      env: { ...process.env, POLYMESH_VERSION: version, SNAPSHOT_PATH: snapshotPath },
    });
    cli.action.stop();

    cli.action.start('connecting to the local node');
    let status = 0;
    const startTime = new Date().getTime();

    const { host, port } = chainNetworkData;
    const url = `http://${host}:${port}`;

    // wait for the node to accept incoming connections
    for (let i = 0; i < iterations && status !== 400; i += 1) {
      ({ status } = await fetch(url).catch(err => {
        if (err.code === 'ECONNRESET') {
          return { status: 0 };
        }

        throw err;
      }));

      // if the chain is ready, or if we have timed out, we break out of the loop
      if (status === 400 || new Date().getTime() - startTime > seconds * 1000) {
        break;
      }

      await cli.wait(2000);
    }

    if (status !== 400) {
      await stopContainers();
      return this.error('timed out while connecting to the node', { exit: 2 });
    }
    cli.action.stop();

    this.log('\n');
    this.log(`local polymesh node listening at wss://${host}:${port}`);
    this.log('happy testing!');
  }
}
