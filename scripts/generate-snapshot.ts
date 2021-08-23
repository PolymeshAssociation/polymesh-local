import { ApiPromise } from '@polkadot/api';
import { HttpProvider } from '@polkadot/rpc-provider';
import { xxhashAsHex } from '@polkadot/util-crypto';
import chalk from 'chalk';
import { execFileSync, execSync, spawn } from 'child_process';
import fetch from 'node-fetch';
import { Presets, SingleBar } from 'cli-progress';
import * as fs from 'fs';
import * as path from 'path';
import { argv } from 'process';

const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir);
}

const SKIP_BUILD = false;
const SKIP_TESTS = false;

const hexPath = path.join(tmpDir, 'runtime.hex');
const originalSpecPath = path.join(tmpDir, 'genesis.json');
const polymeshPath = path.join(tmpDir, 'polymesh');
const schemaPath = path.join(polymeshPath, 'polymesh_schema.json');
const binaryPath = path.join(polymeshPath, 'target/release/polymesh');
const testsPath = path.join(polymeshPath, 'scripts/cli');
const wasmPath = path.join(
  polymeshPath,
  'target/release/wbuild/polymesh-runtime-testnet/polymesh_runtime_testnet.compact.wasm'
);

// Using http endpoint since substrate's Ws endpoint has a size limit.
const provider = new HttpProvider('http://localhost:9933');
// The storage download will be split into 256^chunksLevel chunks.
const chunksLevel = 1;
const totalChunks = Math.pow(256, chunksLevel);

let chunksFetched = 0;
const progressBar = new SingleBar({}, Presets.shades_classic);

/**
 * All module prefixes except those mentioned in the skippedModulesPrefix will be added to this by the script.
 * If you want to add any past module or part of a skipped module, add the prefix here manually.
 *
 * Any storage value’s hex can be logged via console.log(api.query.<module>.<call>.key([...opt params])),
 * e.g. console.log(api.query.timestamp.now.key()).
 *
 * If you want a map/doublemap key prefix, you can do it via .keyPrefix(),
 * e.g. console.log(api.query.system.account.keyPrefix()).
 *
 * For module hashing, do it via xxhashAsHex,
 * e.g. console.log(xxhashAsHex('System', 128)).
 */
const prefixes = [
  '0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9' /* System.Account */,
];
const skippedModulesPrefix = [
  'System',
  'Session',
  'Babe',
  'Grandpa',
  'GrandpaFinality',
  'FinalityTracker',
  'Authorship',
];

function pullPolymesh(tag: string) {
  const POLYMESH_GIT = 'https://github.com/PolymathNetwork/Polymesh.git';
  execSync(`git clone --depth 1 --branch ${tag} ${POLYMESH_GIT} ${polymeshPath}`, {
    stdio: 'inherit',
  });
}

async function fetchRelease(tag: string) {
  const version = tag.replace('v', '');
  const binary = fetch(
    `https://github.com/PolymathNetwork/Polymesh/releases/download/${tag}/polymesh-${version}-linux-amd64.tgz`
  );

  const runtime = fetch(
    `https://github.com/PolymathNetwork/Polymesh/releases/download/${tag}/polymesh_runtime-${version}.tgz`
  );

  const binaryDir = path.dirname(binaryPath);
  if (!fs.existsSync(binaryDir)) {
    fs.mkdirSync(binaryDir, { recursive: true });
  }

  const runtimeDir = path.dirname(wasmPath);
  if (!fs.existsSync(runtimeDir)) {
    fs.mkdirSync(runtimeDir, { recursive: true });
  }

  fs.writeFileSync(path.join(binaryDir, 'binary.tgz'), await (await binary).buffer());
  fs.writeFileSync(path.join(runtimeDir, 'runtime.tgz'), await (await runtime).buffer());

  execSync('tar -xf binary.tgz', { cwd: binaryDir });
  execSync('tar -xf runtime.tgz', { cwd: runtimeDir });

  execSync(`mv polymesh-${version}-linux-amd64 ${binaryPath}`, { cwd: binaryDir });
  execSync(`mv polymesh_runtime_testnet-${version}.wasm ${wasmPath}`, { cwd: runtimeDir });
}

function buildPolymesh() {
  execSync('scripts/init.sh', { cwd: polymeshPath, stdio: 'inherit' });
  execSync('cargo build --release', { cwd: polymeshPath, stdio: 'inherit' });
}

function runChain() {
  const spawnOne = (name: string, i: number) =>
    spawn(
      binaryPath,
      [
        // '--tmp',
        '-d',
        `chain_data/node_${i}`,
        '--rpc-methods=unsafe',
        '--ws-port',
        `${9944 + i}`,
        '--rpc-port',
        `${9933 + i}`,
        '--rpc-cors',
        'all',
        '--rpc-external',
        '--ws-external',
        `--${name}`,
        '--validator',
        '--chain',
        'testnet-dev',
        '--force-authoring',
      ],
      { cwd: polymeshPath, stdio: 'inherit' }
    );
  return [spawnOne('alice', 0), spawnOne('bob', 1), spawnOne('charlie', 2)];
}

function runTests() {
  const cwd = testsPath;
  // next version yarn should work, execSync('yarn', { stdio: 'inherit', cwd });
  execSync('npm ci', { stdio: 'inherit', cwd });
  execSync('npm run build', { stdio: 'inherit', cwd });
  execSync('npm test', { stdio: 'inherit', cwd });
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const tag = argv[2];
  if (!tag) {
    console.log('Please provide a Polymesh tag or branch as an argument');
    process.exit(1);
  }

  const forkedSpecPath = path.join(__dirname, '../src/public/snapshots', `${tag}.json`);

  if (!SKIP_BUILD) {
    if (fs.existsSync(polymeshPath)) {
      fs.rmSync(polymeshPath, { recursive: true });
    }
    pullPolymesh(tag);
    try {
      await fetchRelease(tag);
    } catch {
      console.log('Could not fetch release from github, building binary instead');
      buildPolymesh();
    }
    execFileSync('chmod', ['+x', binaryPath]);
  }

  const chainChildren = runChain();
  try {
    await sleep(10000);
    if (!SKIP_TESTS) {
      runTests();
    }

    execSync('cat ' + wasmPath + ' | hexdump -ve \'/1 "%02x"\' > ' + hexPath);

    console.log(
      chalk.green(
        'We are intentionally using the HTTP endpoint. If you see any warnings about that, please ignore them.'
      )
    );
    const { types, rpc } = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const api = await ApiPromise.create({
      provider,
      types,
      rpc,
    });

    // Download state of original chain
    console.log(
      chalk.green(
        'Fetching current state of the live chain. Please wait, it can take a while depending on the size of your chain.'
      )
    );
    progressBar.start(totalChunks, 0);
    const storage: [string, string][] = [];
    await fetchChunks('0x', chunksLevel, storage);
    progressBar.stop();

    const metadata = await api.rpc.state.getMetadata();
    // Populate the prefixes array
    const modules = JSON.parse(metadata.asLatest.modules.toString());
    modules.forEach((module: { storage?: { prefix: string } }) => {
      if (module.storage) {
        if (!skippedModulesPrefix.includes(module.storage.prefix)) {
          prefixes.push(xxhashAsHex(module.storage.prefix, 128));
        }
      }
    });

    // Generate chain spec for original and forked chains
    execSync(binaryPath + ' build-spec --chain testnet-dev --raw > ' + originalSpecPath);
    execSync(binaryPath + ' build-spec --chain testnet-dev --raw > ' + forkedSpecPath);

    const originalSpec = JSON.parse(fs.readFileSync(originalSpecPath, 'utf8'));
    const forkedSpec = JSON.parse(fs.readFileSync(forkedSpecPath, 'utf8'));

    // Modify chain name and id
    forkedSpec.name = originalSpec.name + '-fork';
    forkedSpec.id = originalSpec.id + '-fork';
    forkedSpec.protocolId = originalSpec.protocolId;

    // Grab the items to be moved, then iterate through and insert into storage
    storage
      .filter(i => prefixes.some(prefix => i[0].startsWith(prefix)))
      .forEach(([key, value]) => (forkedSpec.genesis.raw.top[key] = value));

    // Delete System.LastRuntimeUpgrade to ensure that the on_runtime_upgrade event is triggered
    delete forkedSpec.genesis.raw.top[
      '0x26aa394eea5630e07c48ae0c9558cef7f9cce9c888469bb1a0dceaa129672ef8'
    ];

    // Set the code to the current runtime code
    forkedSpec.genesis.raw.top['0x3a636f6465'] = '0x' + fs.readFileSync(hexPath, 'utf8').trim();

    // To prevent the validator set from changing mid-test, set Staking.ForceEra to ForceNone ('0x02')
    forkedSpec.genesis.raw.top[
      '0x5f3e4907f716ac89b6347d15ececedcaf7dad0317324aecae8744b87fc95f2f3'
    ] = '0x02';

    fs.writeFileSync(forkedSpecPath, JSON.stringify(forkedSpec, null, 4));

    console.log(`Forked genesis generated successfully. Find it at ${forkedSpecPath}`);
  } catch (e) {
    console.error(e);
  } finally {
    for (const child of chainChildren) {
      child.kill();
    }
    process.exit();
  }
}

main();

async function fetchChunks(prefix: string, levelsRemaining: number, storage: [string, string][]) {
  if (levelsRemaining <= 0) {
    const pairs = await provider.send('state_getPairs', [prefix]);
    storage.push(...pairs);
    progressBar.update(++chunksFetched);
    return;
  }

  const promises = [];
  for (let i = 0; i < 256; i++) {
    promises.push(
      fetchChunks(prefix + i.toString(16).padStart(2, '0'), levelsRemaining - 1, storage)
    );
  }
  await Promise.all(promises);
}
