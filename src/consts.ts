import path from 'path';

export const localDir = path.resolve(__dirname, 'local');
export const dataDir = path.resolve(localDir, 'data');
export const snapshotsDir = path.resolve(localDir, 'snapshots');
export const configFileName = 'config.json';

const defaultRestSigners = {
  restSigners: 'alice,bob,charlie',
  restMnemonics: '//Alice,//Bob,//Charlie',
};

export const latestConfig = {
  chainTag: 'latest',
  restTag: 'latest',
  subqueryTag: 'latest',
  toolingTag: 'latest',
  ...defaultRestSigners,
};

export const fiveOneZeroConfig = {
  chainTag: '5.1.0',
  restTag: 'v2.3.0',
  subqueryTag: 'v8.4.2',
  toolingTag: 'v5.0.2',
  ...defaultRestSigners,
};

export const fiveZeroThreeConfig = {
  chainTag: '5.0.3',
  restTag: 'v0.1.1',
  subqueryTag: 'v5.4.2',
  toolingTag: 'v5.0.2',
  ...defaultRestSigners,
};

export const bundledConfig = [fiveOneZeroConfig, fiveZeroThreeConfig, latestConfig];

export const supportedChainVersions = bundledConfig.map(config => config.chainTag);

// This format is compatible with libfaketime is using
export const dateFmt = '+%Y-%m-%d %H:%M:%S';

export const checkSettings = {
  timeout: 360 * 1000,
  iterations: 180,
};

export const chain = {
  url: 'localhost:9944',
};

export const uis = {
  dir: path.resolve(localDir, 'uis'),
  versionFile: path.resolve(localDir, 'uis', 'version.txt'),
  remoteAssets: 'https://github.com/PolymeshAssociation/polymesh-local/releases/download/assets/',
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
  url: 'localhost:3007/graphql',
  oldUrl: 'localhost:3007/dev/graphql',
};

export const postgres = {
  user: 'postgres',
  password: 'postgres',
  host: 'postgres',
  port: '5432',
  db: 'postgres',
};
