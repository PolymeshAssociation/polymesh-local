import { execSync } from 'child_process';
import compose from 'docker-compose';
import fs from 'fs';

import { Metadata } from '../common/snapshots';
import { dataDir, dateFmt, docker, localDir, postgres } from '../consts';

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
  version: string,
  timestamp: string,
  log: boolean
): Promise<void> {
  await compose.upAll({
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
    },
  });
}

export async function stopContainers(): Promise<void> {
  await compose.down({
    cwd: localDir,
    log: false,
    commandOptions: ['--volumes'], // removes volumes
  });
}

export async function anyContainersUp(): Promise<boolean> {
  const ps = await compose.ps({
    cwd: localDir,
  });

  return ps.data.services.length > 0;
}

/**
 * Calculates the current time from the perspective of the container
 *   libfaketime produces a time relative to the start of a process
 *   offset is needed to recalculate this time without having to fork the Polymesh node process
 */
export function containerTime(metadata: Metadata): string {
  const offset = (new Date().getTime() - new Date(metadata.startedAt).getTime()) / 1000;
  return execSync(
    `docker exec ${docker.execContainer} sh -c 'date "${dateFmt}" -d "${offset} seconds"'`
  )
    .toString()
    .trim();
}

// A simple bind mount to the data directory creates permission errors on linux. Instead named volumes are needed.
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
      `docker run --rm -v ${volume}:/source -v ${dataDir}:/data ubuntu tar cvf /data/${volume}.tar /source`,
      { stdio: 'ignore' }
    );
  });
}

export function restoreVolumes(): void {
  createEmptyVolumes();
  execSync('docker pull ubuntu');
  namedVolumes.forEach(volume => {
    execSync(
      `docker run --rm -v ${volume}:/source -v ${dataDir}:/data ubuntu bash -c "cd /source && tar xvf /data/${volume}.tar --strip 1"`,
      { stdio: 'ignore' }
    );
  });
}
