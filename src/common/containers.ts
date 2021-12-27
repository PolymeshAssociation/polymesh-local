import { Command } from '@oclif/command';
import { execSync, spawn } from 'child_process';
import compose from 'docker-compose';
import fs, { rmSync, writeFileSync } from 'fs';
import { join } from 'path';

import { dateToFaketime, epochDuration } from '../common/util';
import { dataDir, faketimeFile, localDir, postgres, tooling, uis } from '../consts';

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

const dateImportedRegex = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.+Imported/;
const importedTimeoutMs = 1000;
const fakeTimePath = join(localDir, faketimeFile);
const composeFile = 'internal-compose.yml';

export async function fastForward(
  cmd: Command,
  rate: number,
  time: number,
  log: boolean,
  chain: string
): Promise<void> {
  const fakeDateString = dateToFaketime(new Date(time));
  try {
    writeFileSync(fakeTimePath, `@${fakeDateString} x1`);
    const p = spawn(
      'docker-compose',
      [
        '-f',
        composeFile,
        'up',
        '--build',
        'fast-forward-alice',
        'fast-forward-bob',
        'fast-forward-charlie',
      ],
      {
        cwd: localDir,
        env: {
          ...process.env,
          DATA_DIR: dataDir,
          CHAIN: chain,
          LOCAL_DIR: localDir,
        },
      }
    );
    p.stdin.setDefaultEncoding('ascii');
    await new Promise((resolve, reject) => {
      let spedUp = false;
      let slowedDown = false;

      let importedTimeout: NodeJS.Timeout | undefined;
      let timedOut = false;
      let lastSeenTimestamp = time;

      const resetTimeout = (lastSeen: number) => {
        lastSeenTimestamp = lastSeen;
        if (importedTimeout !== undefined) {
          clearTimeout(importedTimeout);
        }
        importedTimeout = setTimeout(() => {
          timedOut = true;
          p.kill();
        }, importedTimeoutMs);
      };

      p.stdout.on('data', data => {
        const dataString = data.toString();
        if (log) console.log(dataString);

        if (!spedUp && dateImportedRegex.test(data)) {
          writeFileSync(fakeTimePath, `@${fakeDateString} x${rate}`);
          spedUp = true;
        }

        const dateStr = dateImportedRegex.exec(dataString);
        if (dateStr && dateStr[0]) {
          try {
            const timestamp = Date.parse(dateStr[0] + ' GMT');
            resetTimeout(timestamp);
            if (!slowedDown && timestamp >= Date.now() - epochDuration(chain) * 2) {
              writeFileSync(fakeTimePath, `@${fakeDateString} x100`);
              slowedDown = true;
            }

            if (timestamp >= Date.now() - epochDuration(chain)) {
              writeFileSync(fakeTimePath, `@${fakeDateString} x1`);
              p.kill('SIGKILL');
            }
          } catch {}
        }
      });
      p.stderr.on('data', data => {
        const dataString = data.toString();
        if (log) console.error(dataString);
      });

      p.on('error', reject);

      p.on('exit', code => {
        if (code !== 0 && code != null) {
          reject(
            new Error(
              `Fast forward process exited with code ${code}, try --verbose to debug the problem`
            )
          );
        } else if (timedOut) {
          reject(
            new Error(
              `Fast forwarding failed on ${rate}x speed, try reducing it with using -s ${Math.floor(
                rate / 2
              )}`
            )
          );
        } else {
          resolve(undefined);
        }
      });
    });
  } catch (err) {
    cmd.error('Error trying to fast forward chain: ' + err);
  } finally {
    if (await anyContainersUp(cmd, log)) {
      await stopContainers(cmd, log);
    }
    rmSync(fakeTimePath);
  }
}

function parseISOLocal(s: string) {
  const b: any = s.split(/\D/);
  const d = new Date(b[0], b[1] - 1, b[2], b[3], b[4], b[5]);
  return d.getTime();
}
export async function startContainers(
  cmd: Command,
  version: string,
  log: boolean,
  chain: string,
  services: string[],
  dids: string,
  mnemonics: string
): Promise<void> {
  try {
    const env = {
      ...process.env,
      POLYMESH_VERSION: version,
      DATA_DIR: dataDir,
      PG_USER: postgres.user,
      PG_HOST: postgres.host,
      PG_PASSWORD: postgres.password,
      PG_PORT: postgres.port,
      PG_DB: postgres.db,
      CHAIN: chain,
      TOOLING_API_KEY: tooling.apiKey,
      RELAYER_DIDS: dids,
      RELAYER_MNEMONICS: mnemonics,
      UI_DIR: uis.dir,
      LOCAL_DIR: localDir,
    };
    await compose.pullMany(
      services.filter(service => ['subquery', 'tooling'].includes(service)),
      {
        config: composeFile,
        log,
        cwd: localDir,
        env,
      }
    );

    await compose.upMany(services, {
      cwd: localDir,
      config: composeFile,
      log,
      commandOptions: ['--build', '--remove-orphans'],
      env,
    });
  } catch (err) {
    if (await anyContainersUp(cmd, log)) {
      await stopContainers(cmd, log);
    }
    const error = (err as { err: string }).err ? (err as { err: string }).err : err;
    cmd.error('Error trying to start containers: ' + error);
  }
}

export async function stopContainers(cmd: Command, verbose: boolean): Promise<void> {
  try {
    await compose.down({
      config: composeFile,
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
type ContainerState = {
  name: string;
  state: string;
};
export async function containersState(cmd: Command, verbose: boolean): Promise<ContainerState[]> {
  // The docker-compose library 0.23.13 doesn't fully support docker-compose V2.
  // With `ps` the library would truncate the first service with V2.
  const composeVersion = composeMajorVersion();
  if (composeVersion === 1) {
    const ps = await compose.ps({
      config: composeFile,
      cwd: localDir,
      log: verbose,
    });

    return ps.data.services.map(s => {
      const matches = serviceRegex.exec(s.name);
      if (!matches || !matches[1]) {
        throw new Error('Invalid docker-compose state');
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return { name: matches![1], state: s.state };
    });
  } else if (composeVersion === 2) {
    const services = JSON.parse(
      execSync(`docker-compose -f ${composeFile} ps --format json`, {
        cwd: localDir,
        stdio: 'pipe',
      }).toString()
    );
    return services.map((s: psServiceV2) => ({ name: s.Service, state: s.State }));
  } else {
    cmd.error(
      `docker-compose version: ${composeVersion} detected. Only v1 and v2 are currently supported`
    );
  }
}
export async function containersUp(cmd: Command, verbose: boolean): Promise<string[]> {
  return (await containersState(cmd, verbose)).map(s => s.name);
}
export async function anyContainersRunning(cmd: Command, verbose: boolean): Promise<boolean> {
  return (
    (await containersState(cmd, verbose)).filter(s => {
      return s.state === 'Up';
    }).length > 0
  );
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
      config: composeFile,
      cwd: localDir,
    });
    const service = ps.data.services.find(s => s.name.match(regex));
    return service?.name || '';
  } else if (composeVersion === 2) {
    const services = JSON.parse(
      execSync(`docker-compose -f ${composeFile} ps --format json`, {
        cwd: localDir,
        stdio: 'pipe',
      }).toString()
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
  return (await containersState(cmd, verbose)).length > 0;
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
