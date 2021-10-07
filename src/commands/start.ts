import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
import { existsSync } from 'fs';

import { isChainUp } from '../common/chain';
import {
  anyContainersUp,
  anyVolumes,
  createEmptyVolumes,
  prepareDockerfile,
  removeVolumes,
  startContainers,
  stopContainers,
} from '../common/containers';
import { getMetadata, loadSnapshot, Metadata, writeMetadata } from '../common/snapshots';
import { isSubqueryUp } from '../common/subquery';
import { isToolingUp } from '../common/tooling';
import { hostTime, printInfo, retry } from '../common/util';
import { dataDir } from '../consts';
import { chainRunningError } from '../errors';

export default class Start extends Command {
  static description = 'Start all the services';

  static usage = 'start [OPTIONS]';

  static flags = {
    help: flags.help({ char: 'h' }),
    version: flags.string({
      char: 'v',
      default: '4.0.0',
      description: 'version of the containers to run',
      options: ['4.0.0'],
    }),
    image: flags.string({
      char: 'i',
      description:
        '(Advanced) Specify a local docker image to use for Polymesh containers. Such an image should be debian based and have the polymesh node binary set as its entrypoint',
    }),
    chain: flags.string({
      description:
        '(Advanced) Specify a Polymesh runtime. ci-dev has reduced block times letting it process transactions faster than testnet-dev',
      options: ['testnet-dev', 'ci-dev'],
    }),
    snapshot: flags.string({
      char: 's',
      description: 'Loads snapshot before starting. Current state used if not passed',
    }),
    clean: flags.boolean({
      char: 'c',
      default: false,
      description: 'Cleans state before starting',
    }),
    only: flags.string({
      multiple: true,
      default: ['chain', 'subquery', 'gql'],
      char: 'o',
      description: 'Run only some services',
      options: ['chain', 'subquery', 'gql'],
    }),
    verbose: flags.boolean({
      description: 'enables verbose output',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags: commandFlags } = this.parse(Start);
    const { clean, snapshot, verbose, version, image, chain, only } = commandFlags;
    const typedOnly = only as ('chain' | 'subquery' | 'gql')[];

    if (await anyContainersUp()) {
      this.error(chainRunningError);
    }

    if (clean) {
      cli.action.start('Removing old state');
      removeVolumes();
      cli.action.stop();
    }

    if (!anyVolumes()) {
      cli.action.start('No volumes detected. Initializing volumes');
      createEmptyVolumes();
      cli.action.stop();
    }

    let metadata: Metadata;
    if (snapshot) {
      cli.action.start('Loading chain snapshot');
      await loadSnapshot(this, snapshot);
      cli.action.stop();
    }

    if (!existsSync(dataDir)) {
      cli.action.start('No previous data found. Initializing data directory');
      metadata = { version, time: hostTime(), startedAt: '', chain: chain || 'testnet-dev' };
      if (image) {
        metadata.version = image;
      }
      cli.action.stop();
    } else {
      cli.log('Found existing data');
      metadata = getMetadata();
    }

    if (!image && version !== metadata.version) {
      this.error(
        `Polymesh version ${version} was specified, but data was for ${metadata.version}. Either use "--clean" to start with a fresh state, or load a snapshot that matches the version`
      );
    }
    if (chain && chain !== metadata.chain) {
      this.error(
        `Polymesh chain ${chain} was specified, but data was for ${metadata.chain}. Either use "--clean" to start with a fresh state, or load a snapshot that matches the chain`
      );
    }
    metadata.startedAt = new Date().toISOString();
    writeMetadata(metadata);

    cli.action.start(`Preparing dockerfile for Polymesh version: ${image || version}`);
    prepareDockerfile(version, image);
    cli.action.stop();

    const services = typedOnly.flatMap(o => {
      switch (o) {
        case 'chain':
          return ['alice', 'bob', 'charlie'];
        case 'subquery':
          return ['subquery'];
        case 'gql':
          return ['tooling'];
      }
      return [];
    });

    cli.action.start('Starting the containers');
    await startContainers(version, metadata.time, verbose, metadata.chain, services);
    cli.action.stop();

    const allChecks = { chain: isChainUp, subquery: isSubqueryUp, gql: isToolingUp };
    const checks = typedOnly.map(o => allChecks[o]);

    cli.action.start('Checking service liveness');
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
