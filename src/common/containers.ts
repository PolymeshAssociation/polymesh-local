import compose from 'docker-compose';

import { publicPath } from '../consts';

export async function stopContainers(): Promise<void> {
  await compose.down({
    cwd: publicPath,
    log: false,
  });
}
