/*
  This script creates a chain, runs tests and saves the state so it can be used for later testing.
  At a high level the steps are:

  1. Fetch the Polymesh repository for its test scripts
  2. Use the start command to bring up an environment
  3. Run the test scripts found in the Polymesh/scripts/cli/tests directory to populate data
  4. Use the save command to create a snapshot
*/
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { argv } from 'process';

const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir);
}

const cliDir = path.join(__dirname, '..', 'bin');
const polymeshPath = path.join(tmpDir, 'polymesh');
const testsPath = path.join(polymeshPath, 'scripts/cli');

function pullPolymesh(tag: string) {
  if (fs.existsSync(polymeshPath)) {
    fs.rmSync(polymeshPath, { recursive: true });
  }
  const POLYMESH_GIT = 'https://github.com/PolymathNetwork/Polymesh.git';
  execSync(`git clone --depth 1 --branch ${tag} ${POLYMESH_GIT} ${polymeshPath}`, {
    stdio: 'inherit',
  });
}

function runTests() {
  const cwd = testsPath;
  // change to yarn when we move to Polymesh 3.3 and remove 3.2 support
  execSync('npm ci', { stdio: 'inherit', cwd });
  execSync('npm run build', { stdio: 'inherit', cwd });
  execSync('npm test', { stdio: 'inherit', cwd });
}

async function main() {
  const tag = argv[2];
  if (!tag) {
    console.log('Please provide a Polymesh tag or branch as an argument');
    process.exit(1);
  }
  const version = tag.replace('v', '');
  const image = argv[3];
  if (image && execSync(`docker images -q ${image}`).toString() === '') {
    console.error(`Image ${image} was not found`);
    process.exit(1);
  }
  const imageFlag = image ? `--image=${image}` : '';
  const versionFlag = `--version=${version}`;

  pullPolymesh(tag);

  try {
    execSync(`${cliDir}/run start --clean ${image ? imageFlag : versionFlag} --verbose`);
    runTests();
    execSync(`${cliDir}/run save ${version}`);
  } finally {
    execSync(`${cliDir}/run stop --clean`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
