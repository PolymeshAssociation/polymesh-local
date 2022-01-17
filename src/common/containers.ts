import { Command } from '@oclif/command';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Events } from '@polkadot/api/base/Events';
import { Data } from '@polkadot/types';
import { execSync, spawn } from 'child_process';
import compose from 'docker-compose';
import fs, { existsSync, lstatSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import process from 'process';

import { getMetadata, replaceSnapshot, snapshotPath, writeMetadata } from '../common/snapshots';
import { dateToFaketime, epochDuration, UserConfig } from '../common/util';
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

const startTimeoutMs = 20_000;
const fakeTimePath = join(localDir, faketimeFile);
const composeFile = 'internal-compose.yml';

export async function fastForward(
  cmd: Command,
  fastForwardRate: number | undefined,
  snapshotFile: string | undefined,
  time: number,
  log: boolean,
  chain: string,
  version: string
): Promise<Date> {
  const rate = fastForwardRate || (chain.startsWith('ci') ? 400 : 1000);
  // const rate = 1;
  const importedTimeoutMs = (chain.startsWith('ci') ? 500 : 60_000) * 10;
  const fakeDateString = dateToFaketime(new Date(time));

  if (existsSync(fakeTimePath) && lstatSync(fakeTimePath).isDirectory()) {
    rmdirSync(fakeTimePath);
  }
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
  if (log) {
    p.stderr.on('data', chunk => console.error(chunk.toString()));
    p.stdout.on('data', chunk => console.log(chunk.toString()));
  }

  // Handle Ctrl-C
  let nForceQuit = 3;
  let quit = false;
  const sigIntHandler = () => {
    quit = true;

    writeFileSync(fakeTimePath, `@${fakeDateString} x1`);
    p.kill('SIGKILL');

    if (nForceQuit === 0) {
      process.exit(1);
    } else {
      cmd.log(`Stopping gracefully, press CTRL-C ${nForceQuit} more times to force quit`);
      nForceQuit--;
    }
  };

  process.stdin.resume();
  process.on('SIGINT', sigIntHandler);
  let api: ApiPromise | undefined;

  try {
    const wsProvider = new WsProvider('ws://0.0.0.0:10044');
    const { rpc, types } = JSON.parse(
      readFileSync(join(localDir, `schemas/polymesh_schema_${version}.json`), { encoding: 'utf-8' })
    );
    api = await ApiPromise.create({ provider: wsProvider, types, rpc });

    return await new Promise((resolve, reject) => {
      let importedTimeout: NodeJS.Timeout | undefined;
      let timedOut = false;
      let lastSeenTimestamp = time;

      // Timeout in case the chain produces no blocks
      let startTimeout: NodeJS.Timeout | undefined = setTimeout(() => {
        importedTimeout && clearTimeout(importedTimeout);
        timedOut = true;
        writeFileSync(fakeTimePath, `@${fakeDateString} x1`);
        p.kill('SIGKILL');
      }, startTimeoutMs);

      let spedUp = false;
      let createdBlockWhileSpedUp = false;

      // Timeout in case the chain stops producing blocks in the middle of fast forwarding
      const resetTimeout = (lastSeen: number) => {
        lastSeenTimestamp = lastSeen;
        if (importedTimeout !== undefined) {
          clearTimeout(importedTimeout);
        }
        importedTimeout = setTimeout(() => {
          timedOut = true;
          writeFileSync(fakeTimePath, `@${fakeDateString} x1`);
          p.kill('SIGKILL');
        }, importedTimeoutMs / (createdBlockWhileSpedUp && !slowedDown ? rate : 1));
      };

      let slowedDown = false;
      let oldTimestamp: number | undefined;
      api!.rpc.chain.subscribeFinalizedHeads(async () => {
        const timestamp = (await api!.query.timestamp.now()).toJSON() as number;
        if (!oldTimestamp || timestamp <= oldTimestamp) {
          oldTimestamp = timestamp;
          return;
        }
        oldTimestamp = timestamp;
        if (spedUp) {
          createdBlockWhileSpedUp = true;
        }

        startTimeout && clearTimeout(startTimeout);
        startTimeout = undefined;

        if (!spedUp) {
          writeFileSync(fakeTimePath, `@${fakeDateString} x${rate}`);
          spedUp = true;
        }
        // 1636478810354
        // aaa 1636459700354
        try {
          resetTimeout(timestamp);
          if (!slowedDown && timestamp >= Date.now() - epochDuration(chain) * 2) {
            writeFileSync(fakeTimePath, `@${fakeDateString} x100`);
            slowedDown = true;
          }

          if (timestamp >= Date.now() - epochDuration(chain)) {
            importedTimeout && clearTimeout(importedTimeout);

            writeFileSync(fakeTimePath, `@${fakeDateString} x1`);
            p.kill('SIGKILL');
          }
        } catch {}
      });

      p.on('error', reject);

      p.on('exit', code => {
        if (code !== 0 && code != null) {
          reject(
            new Error(
              `Fast forward process exited with code ${code}, try --verbose to debug the problem`
            )
          );
        } else if (timedOut || quit) {
          const metadata = getMetadata();
          metadata.stopTimestamp = lastSeenTimestamp;
          writeMetadata(metadata);

          if (snapshotFile && lastSeenTimestamp !== time) {
            replaceSnapshot(
              cmd,
              snapshotPath(snapshotFile),
              log,
              new Date(time),
              new Date(lastSeenTimestamp)
            );
          }
          timedOut
            ? reject(
                new Error(
                  `Fast forwarding failed on ${rate}x speed, try reducing it using -r ${Math.floor(
                    rate * 0.8
                  )}`
                )
              )
            : reject(new Error('Fast forward process stopped by interrupt signal.'));
        } else {
          resolve(new Date(lastSeenTimestamp));
        }
      });
    });
  } catch (err) {
    cmd.error('Error trying to fast forward chain: ' + err);
  } finally {
    api?.disconnect();
    process.off('SIGINT', sigIntHandler);
    if (await anyContainersUp(cmd, log)) {
      await stopContainers(cmd, log);
    }
    rmSync(fakeTimePath);
  }
  return new Date(); // Unreachable
}

export async function startContainers(
  cmd: Command,
  version: string,
  log: boolean,
  chain: string,
  services: string[],
  dids: string,
  mnemonics: string,
  userConfig: UserConfig
): Promise<void> {
  try {
    const toolingTag = userConfig.toolingTag || 'latest';
    const subqueryTag = userConfig.subqueryTag || 'latest';
    const restTag = userConfig.restTag || 'latest';
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
      TOOLING_TAG: toolingTag,
      SUBQUERY_TAG: subqueryTag,
      REST_TAG: restTag,
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

export function backupVolumes(verbose: boolean): void {
  execSync('docker pull ubuntu');
  namedVolumes.forEach(volume => {
    execSync(
      `docker run --name polymesh_archiver --rm -v ${volume}:/source -v ${dataDir}:/data ubuntu tar cvf /data/${volume}.tar /source`,
      { stdio: verbose ? 'inherit' : 'ignore' }
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
