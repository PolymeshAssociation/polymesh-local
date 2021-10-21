import path from 'path';

export const localDir = path.resolve(__dirname, 'local');
export const dataDir = path.resolve(localDir, 'data');
export const snapshotsDir = path.resolve(localDir, 'snapshots');

// This format is compatible with libfaketime is using
export const dateFmt = '+%Y-%m-%d %H:%M:%S';

export const checkSettings = {
  timeout: 90 * 1000,
  iterations: 45,
};

export const chain = {
  url: 'localhost:9944',
};

export const subquery = {
  url: 'localhost:3002',
};

export const rest = {
  url: 'localhost:3004',
  container: 'local_rest_api_1',
};

export const tooling = {
  apiKey: 'd41d8cd98f00b204e9800998ecf8427e',
  url: 'localhost:3000/dev/graphql',
};

export const postgres = {
  user: 'postgres',
  password: 'postgres',
  host: 'postgres',
  port: '5432',
  db: 'postgres',
};

export const docker = {
  execContainer: 'local_alice_1',
};
