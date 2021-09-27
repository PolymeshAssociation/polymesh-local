import { execSync } from 'child_process';
import compose from 'docker-compose';
import fs from 'fs';

import { Metadata } from '../common/snapshots';
import { dataDir, dateFmt, docker, localDir, postgres } from '../consts';

export function prepareDockerfile(version: string): void {
  const template = fs.readFileSync(`${localDir}/mesh.Dockerfile.template`).toString();
  const dockerfile = template.replace(/{{VERSION}}/, version);
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

export async function cleanUp(): Promise<void> {
  if (fs.existsSync(dataDir)) {
    execSync(`rm -r ${dataDir}`);
  }
}

//
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
