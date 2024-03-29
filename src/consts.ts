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

export const fiveTwoZeroConfig = {
  chainTag: '5.2.0',
  restTag: 'v2.6.0',
  subqueryTag: 'v9.1.0',
  toolingTag: 'v5.0.2',
  ...defaultRestSigners,
};

export const fiveThreeZeroConfig = {
  chainTag: '5.3.0',
  restTag: 'v3.0.0',
  subqueryTag: 'v9.3.1',
  toolingTag: 'v5.0.2',
  ...defaultRestSigners,
};

export const fiveFourZeroConfig = {
  chainTag: '5.4.0',
  restTag: 'v3.1.0',
  subqueryTag: 'v9.6.1',
  toolingTag: 'v5.0.2',
  ...defaultRestSigners,
};

export const fiveOneThreeConfig = {
  chainTag: '5.1.3',
  restTag: 'v2.4.0',
  subqueryTag: 'v8.5.2',
  toolingTag: 'v5.0.2',
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

export const bundledConfig = [
  fiveFourZeroConfig,
  fiveThreeZeroConfig,
  fiveTwoZeroConfig,
  fiveOneThreeConfig,
  fiveOneZeroConfig,
  fiveZeroThreeConfig,
  latestConfig,
];

export const defaultConfig = bundledConfig[0];

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
  graphql: 'localhost:3009',
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
