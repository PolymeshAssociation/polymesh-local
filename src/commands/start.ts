import { Command, flags } from '@oclif/command';
import { execSync } from 'child_process';
import cli from 'cli-ux';
import compose from 'docker-compose';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';

import { stopContainers } from '../common/containers';
import { chainNetworkData, chainsPath, publicPath, snapshotsDir } from '../consts';

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
    snapshot: flags.string({ char: 's', description: 'path to a custom snapshot' }),
    timeout: flags.string({
      char: 't',
      default: '60',
      description:
        'maximum amount of seconds to wait for the local node to be able to receive connections',
    }),
  };

  async run(): Promise<void> {
    // If the node is running it should return a 400 since fetch won't upgrade to WS
    let status = 0;
    const { host, port } = chainNetworkData;
    const url = `http://${host}:${port}`;
    ({ status } = await fetch(url).catch(() => {
      return { status: 0 };
    }));

    if (status === 400) {
      this.log(`chain is already running at wss://${host}:${port}`);
      return;
    }

    const iterations = 20;
    const { flags: commandFlags } = this.parse(Start);

    const { version, timeout, snapshot } = commandFlags;

    const snapshotPath = snapshot || path.resolve(snapshotsDir, `${version}.tgz`);

    if (!fs.existsSync(snapshotPath) && !fs.existsSync(chainsPath)) {
      return this.error('"snapshot" does not exist', { exit: 2 });
    }

    // unzip the tar file if there is no chains directory
    if (fs.existsSync(chainsPath)) {
      console.log('removing old chain data');
      execSync(`rm -rf ${chainsPath}`);
    }
    execSync(`tar -xf ${version}.tgz`, { cwd: snapshotsDir });
    execSync('chmod -R 777 chains', { cwd: snapshotsDir });
    this.log('snapshot unzipped');

    const seconds = Number(timeout);

    if (isNaN(seconds) || seconds < iterations) {
      return this.error(`"timeout" must be a number greater or equal than ${iterations}`, {
        exit: 2,
      });
    }

    cli.action.start('starting the polymesh container');
    await compose.upAll({
      cwd: publicPath,
      log: true,
      env: {
        ...process.env,
        POLYMESH_VERSION: version,
        SNAPSHOT_PATH: chainsPath,
      },
    });
    cli.action.stop();

    cli.action.start('connecting to the local node');
    const startTime = new Date().getTime();

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
