import { execFileSync, execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { argv } from 'process';
import fetch from 'node-fetch';

const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir);
}

const SKIP_BUILD = false;
const SKIP_TESTS = false;

const polymeshPath = path.join(tmpDir, 'polymesh');
const binaryPath = path.join(polymeshPath, 'target/release/polymesh');
const testsPath = path.join(polymeshPath, 'scripts/cli');
const wasmPath = path.join(
  polymeshPath,
  'target/release/wbuild/polymesh-runtime-testnet/polymesh_runtime_testnet.compact.wasm'
);

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
  const version = tag.replace('v', '');
  const snapshotPath = path.join(__dirname, '../src/public/snapshots', `${version}.tgz`);

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
  } catch (e) {
    console.error(e);
  } finally {
    for (const child of chainChildren) {
      child.kill();
    }
    const chainDataPath = path.join(polymeshPath, '/chain_data/node_0');

    execSync(`chmod -R 777 ${chainDataPath} `);
    execSync(`tar -czvf ${snapshotPath} .`, { cwd: chainDataPath });
    process.exit();
  }
}

main();
