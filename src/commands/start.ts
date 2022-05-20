import { flags } from '@oclif/command';
import cli from 'cli-ux';
import { existsSync } from 'fs';

import Command from '../base';
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
import { isRestUp, validateMnemonics } from '../common/rest';
import { getMetadata, loadSnapshot, Metadata, writeMetadata } from '../common/snapshots';
import { isSubqueryUp } from '../common/subquery';
import { isToolingUp } from '../common/tooling';
import { areUIsUp, clearUIs, fetchUIs } from '../common/uis';
import { hostNow, printInfo, retry } from '../common/util';
import { dataDir, supportedChainVersions } from '../consts';
import { chainRunningError } from '../errors';

export default class Start extends Command {
  static description = 'Start all the services';

  static usage = 'start [OPTIONS]';

  static flags = {
    help: flags.help({ char: 'h' }),
    version: flags.string({
      char: 'v',
      // Note: The actual value passed to the default function doesn't match its type. We use any so we can access the user config if its present
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default: (ctx: any) => {
        return ctx.userConfig?.chainTag || '4.1.1';
      },
      description: 'version of the containers to run',
      options: supportedChainVersions,
    }),
    image: flags.string({
      char: 'i',
      description:
        '(Advanced) Specify a local docker image to use for Polymesh containers. Such an image should be debian based and have the polymesh node binary set as its entrypoint',
    }),
    chain: flags.string({
      char: 'C',
      description:
        '(Advanced) Specify a Polymesh runtime. ci-dev has reduced block times letting it process transactions faster than testnet-dev',
      options: [
        'dev',
        'local',
        'testnet-dev',
        'ci-dev',
        'ci-local',
        'testnet-local',
        'testnet-bootstrap',
        'mainnet-dev',
        'mainnet-local',
        'mainnet-bootstrap',
        'mainnet',
        'testnet',
      ],
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
      default: ['chain', 'subquery', 'gql', 'rest', 'uis'],
      char: 'o',
      description: 'Run only some services',
      options: ['chain', 'subquery', 'gql', 'rest', 'uis'],
    }),
    verbose: flags.boolean({
      description: 'enables verbose logging',
      default: false,
    }),
    restSigners: flags.string({
      description: 'Comma separated list of signers available in the rest api. Defaults to `alice`',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default: (ctx: any) => {
        return ctx.userConfig?.restDids || 'alice';
      },
    }),
    restMnemonics: flags.string({
      description: 'Comma separated list of signer mnemonics. Defaults to `//Alice`',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default: (ctx: any) => {
        return ctx.userConfig?.restMnemonics || '//Alice';
      },
    }),
    vaultUrl: flags.string({
      description: 'The URL the Vault transit engine to use with the REST API',
      default: '',
    }),
    vaultToken: flags.string({
      description: 'The Vault API key to use with the REST API',
      default: '',
    }),
    uiLatest: flags.boolean({
      char: 'u',
      description: 'Clears saved UIs so the latest can be fetched',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags: commandFlags } = this.parse(Start);
    const {
      clean,
      snapshot,
      verbose,
      version,
      image,
      chain,
      only,
      restSigners,
      restMnemonics,
      uiLatest,
      vaultUrl,
      vaultToken,
    } = commandFlags;
    const typedOnly = only as ('chain' | 'subquery' | 'gql' | 'rest' | 'uis')[];
    if (await anyContainersUp(this, verbose)) {
      this.error(chainRunningError);
    }

    if (version === '5.0.0') {
      this.warn(
        '5.0.0 is still under active development. Using the flag `--only chain` is recommended as not all services are compatible with 5.0.0 chains yet'
      );
    }

    if (clean) {
      cli.action.start('Removing old state');
      removeVolumes();
      cli.action.stop();
    }

    if (uiLatest) {
      cli.action.start('Clearing current UIs');
      clearUIs();
      cli.action.stop();
    }

    const mnemonicValidation = validateMnemonics(restMnemonics, restSigners);
    if (typeof mnemonicValidation === 'string') {
      this.error(mnemonicValidation);
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
      metadata = { version, time: hostNow(), startedAt: '', chain: chain || 'dev' };
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

    if (only.includes('uis')) {
      cli.action.start('Checking UIs');
      await fetchUIs(version);
      cli.action.stop();
    }

    cli.action.start(`Preparing dockerfile for Polymesh version: ${image || version}`);
    prepareDockerfile(version, image);
    cli.action.stop();

    const services = typedOnly.flatMap(o => {
      switch (o) {
        case 'chain':
          return ['alice', 'bob', 'charlie', 'schema'];
        case 'subquery':
          return ['subquery'];
        case 'gql':
          return ['tooling'];
        case 'rest':
          return ['rest_api'];
        case 'uis':
          return ['dashboard', 'bridge', 'governance', 'issuer'];
      }
      return [];
    });

    cli.action.start('Starting the containers (this may take a while)');
    await startContainers(
      this,
      version,
      metadata.time,
      verbose,
      metadata.chain,
      services,
      restSigners,
      restMnemonics,
      vaultUrl,
      vaultToken,
      this.userConfig
    );
    cli.action.stop();

    const allChecks = {
      chain: isChainUp,
      subquery: isSubqueryUp,
      gql: isToolingUp,
      rest: isRestUp,
      uis: areUIsUp,
    };
    const checks = typedOnly.map(o => allChecks[o]);

    cli.action.start('Checking service liveness');
    const results = await Promise.all(checks.map(c => retry(c)));
    if (!results.every(Boolean)) {
      const resultMsgs = checks.map((c, i) => `${c.name}: ${results[i]}`);
      await stopContainers(this, verbose);
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
