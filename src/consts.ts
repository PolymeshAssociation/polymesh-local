import path from 'path';

export const localDir = path.resolve(__dirname, 'local');
export const dataDir = path.resolve(localDir, 'data');
export const snapshotsDir = path.resolve(localDir, 'snapshots');
export const configFileName = 'config.json';
export const supportedChainVersions = ['4.0.0', '4.1.1', '5.0.0'];

export const defaultUserConfig = {
  chainTag: '4.1.1',
  restTag: 'v0.0.6',
  subqueryTag: 'v4.1.0-s3',
  toolingTag: 'v6.0.0-alpha.1',
  restSigners: 'alice',
  restMnemonics: '//Alice',
};

// This format is compatible with libfaketime is using
export const dateFmt = '+%Y-%m-%d %H:%M:%S';

export const checkSettings = {
  timeout: 90 * 1000,
  iterations: 45,
};

export const chain = {
  url: 'localhost:9944',
};

export const uis = {
  dir: path.resolve(localDir, 'uis'),
  versionFile: path.resolve(localDir, 'uis', 'version.txt'),
  s3: 'https://polymesh-local.s3.amazonaws.com',
  dashboard: 'localhost:3000',
  bridge: 'localhost:3001',
  issuer: 'localhost:3002',
  governance: 'localhost:3003',
};

export const subquery = {
  url: 'localhost:3006',
};

export const rest = {
  url: 'localhost:3004',
};

export const tooling = {
  apiKey: 'd41d8cd98f00b204e9800998ecf8427e',
  url: 'localhost:3007/dev/graphql',
};

export const postgres = {
  user: 'postgres',
  password: 'postgres',
  host: 'postgres',
  port: '5432',
  db: 'postgres',
};
