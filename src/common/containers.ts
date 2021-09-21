import compose from 'docker-compose';
import fs from 'fs';

import { dockerPath } from '../consts';

export function prepareDockerfile(version: string): void {
  const template = fs.readFileSync(`${dockerPath}/mesh.Dockerfile.template`).toString();
  const docker = template.replace(/{{VERSION}}/, version);
  fs.writeFileSync(`${dockerPath}/mesh.Dockerfile`, docker);
}

export async function stopContainers(): Promise<void> {
  await compose.down({
    cwd: dockerPath,
    log: false,
    commandOptions: ['--volumes'], // removes volumes
  });
}
