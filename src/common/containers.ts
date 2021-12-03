import { Command } from '@oclif/command';
import { execSync } from 'child_process';
import compose from 'docker-compose';
import fs from 'fs';

import { dataDir, localDir, postgres, tooling, uis } from '../consts';

export function prepareDockerfile(version: string, image?: string): void {
  const template = fs.readFileSync(`${localDir}/mesh.Dockerfile.template`).toString();
  let dockerfile;
  if (image) {
    dockerfile = template.replace(/FROM.*/, `FROM ${image}`);
  } else {
    dockerfile = template.replace(/{{VERSION}}/, version);
  }
  fs.writeFileSync(`${localDir}/mesh.Dockerfile`, dockerfile);
}

export async function startContainers(
  cmd: Command,
  version: string,
  timestamp: string,
  log: boolean,
  chain: string,
  services: string[],
  dids: string,
  mnemonics: string
): Promise<void> {
  try {
    await compose.pullMany(
      services.filter(service => ['subquery', 'tooling'].includes(service)),
      { log, cwd: localDir }
    );

    await compose.upMany(services, {
      cwd: localDir,
      log,
      commandOptions: ['--build'],
      env: {
        ...process.env,
        POLYMESH_VERSION: version,
        DATA_DIR: dataDir,
        PG_USER: postgres.user,
        PG_HOST: postgres.host,
        PG_PASSWORD: postgres.password,
        PG_PORT: postgres.port,
        PG_DB: postgres.db,
        FAKETIME: `@${timestamp}`,
        CHAIN: chain,
        TOOLING_API_KEY: tooling.apiKey,
        RELAYER_DIDS: dids,
        RELAYER_MNEMONICS: mnemonics,
        UI_DIR: uis.dir,
        LOCAL_DIR: localDir,
      },
    });
  } catch (err) {
    if (await anyContainersUp(cmd, log)) {
      await stopContainers(cmd, log);
    }
    cmd.error('Error trying to start containers: ' + (err as { err: string }).err);
  }
}

export async function stopContainers(cmd: Command, verbose: boolean): Promise<void> {
  try {
    await compose.down({
      cwd: localDir,
      log: verbose,
      commandOptions: ['--volumes'], // removes volumes
    });
  } catch (err) {
    cmd.error('Error trying to stop containers: ' + (err as { err: string }).err);
  }
}

interface psServiceV2 {
  ID: string;
  Name: string;
  Service: string;
  Project: string;
  State: string;
  Health: string;
  ExitCode: number;
}
const serviceRegex = /local_(.+)_1/;
export async function containersUp(cmd: Command, verbose: boolean): Promise<string[]> {
  // The docker-compose library 0.23.13 doesn't fully support docker-compose V2.
  // With `ps` the library would truncate the first service with V2.
  const composeVersion = composeMajorVersion();
  if (composeVersion === 1) {
    const ps = await compose.ps({
      cwd: localDir,
      log: verbose,
    });

    return ps.data.services.map(s => {
      const matches = serviceRegex.exec(s.name);
      if (!matches || !matches[1]) {
        throw new Error('Invalid docker-compose state');
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return matches![1];
    });
  } else if (composeVersion === 2) {
    const services = JSON.parse(
      execSync('docker-compose ps --format json', { cwd: localDir, stdio: 'pipe' }).toString()
    );
    return services.map((s: psServiceV2) => s.Service);
  } else {
    cmd.error(
      `docker-compose version: ${composeVersion} detected. Only v1 and v2 are currently supported`
    );
  }
}

function composeMajorVersion(): number {
  const versionRegex = /(\d+)\.\d+\.\d+/;
  const result = execSync('docker-compose --version').toString();
  const versionMatches = versionRegex.exec(result);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return Number(versionMatches![1]);
}

/**
 * @param serviceName
 * @returns the running container name or empty string if service is not found
 */
export async function containerName(cmd: Command, serviceName: string): Promise<string> {
  const composeVersion = composeMajorVersion();
  if (composeVersion === 1) {
    const regex = new RegExp(`local(?:_|-)${serviceName}(?:_|-)1`);

    const ps = await compose.ps({
      cwd: localDir,
    });
    const service = ps.data.services.find(s => s.name.match(regex));
    return service?.name || '';
  } else if (composeVersion === 2) {
    const services = JSON.parse(
      execSync('docker-compose ps --format json', { cwd: localDir, stdio: 'pipe' }).toString()
    );
    const service = services.find((s: psServiceV2) => s.Service === serviceName);
    return service?.Name || '';
  } else {
    cmd.error(
      `docker-compose version: ${composeVersion} detected. Only v1 and v2 are currently supported`
    );
  }
}

export function getContainerEnv(container: string, env: string): string {
  return execSync(`docker exec ${container} bash -c "echo $${env}"`).toString().trim();
}

export async function anyContainersUp(cmd: Command, verbose: boolean): Promise<boolean> {
  return (await containersUp(cmd, verbose)).length > 0;
}

// A bind mount to the data directory creates permission errors on linux. Instead named volumes are needed.
// To export volumes we spin up a container to tar the contents, vice versa for importing.
// Technique from: https://docs.docker.com/storage/volumes/#backup-restore-or-migrate-data-volumes
const namedVolumes = ['polymesh_alice', 'polymesh_bob', 'polymesh_charlie', 'polymesh_postgres'];

export function createEmptyVolumes(): void {
  namedVolumes.forEach(volume => {
    execSync(`docker volume create --name=${volume}`);
  });
}

export async function removeVolumes(): Promise<void> {
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true });
  }
  if (anyVolumes()) {
    namedVolumes.forEach(volume => {
      execSync(`docker volume rm ${volume}`);
    });
  }
}

export function anyVolumes(): boolean {
  return (
    execSync('docker volume ls -q')
      .toString()
      .split('\n')
      .filter(v => namedVolumes.indexOf(v) !== -1).length > 0
  );
}

export function backupVolumes(): void {
  execSync('docker pull ubuntu');
  namedVolumes.forEach(volume => {
    execSync(
      `docker run --name polymesh_archiver --rm -v ${volume}:/source -v ${dataDir}:/data ubuntu tar cvf /data/${volume}.tar /source`,
      { stdio: 'ignore' }
    );
  });
}

export function restoreVolumes(): void {
  createEmptyVolumes();
  execSync('docker pull ubuntu');
  namedVolumes.forEach(volume => {
    execSync(
      `docker run --name polymesh_archiver --rm -v ${volume}:/source -v ${dataDir}:/data ubuntu bash -c "cd /source && tar xvf /data/${volume}.tar --strip 1"`,
      { stdio: 'ignore' }
    );
  });
}
