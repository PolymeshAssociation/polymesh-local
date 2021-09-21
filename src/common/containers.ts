import { execSync } from 'child_process';
import compose from 'docker-compose';
import fs from 'fs';

import { dataDir, dateFmt, localDir, postgres } from '../consts';

export function prepareDockerfile(version: string): void {
  const template = fs.readFileSync(`${localDir}/mesh.Dockerfile.template`).toString();
  const docker = template.replace(/{{VERSION}}/, version);
  fs.writeFileSync(`${localDir}/mesh.Dockerfile`, docker);
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
  });
}

export async function cleanUp(): Promise<void> {
  if (fs.existsSync(dataDir)) {
    execSync(`rm -r ${dataDir}`);
  }
}

export function containerTime(container: string): string {
  return execSync(`docker exec ${container} sh -c 'date "${dateFmt}"'`).toString().trim();
}
