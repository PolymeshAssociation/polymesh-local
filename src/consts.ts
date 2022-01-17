import path from 'path';

export const localDir = path.resolve(__dirname, 'local');
export const dataDir = path.resolve(localDir, 'data');
export const snapshotsDir = path.resolve(localDir, 'snapshots');
export const configFileName = 'config.json';
export const supportedChainVersions = ['4.0.0', '4.1.0-rc1'];

export const defaultUserConfig = {
  chainTag: '4.0.0',
  restTag: 'v0.0.3',
  subqueryTag: 'v4.0.0',
  toolingTag: 'v6.0.0-alpha.1',
  restDids: '0x0600000000000000000000000000000000000000000000000000000000000000',
  restMnemonics: '//Alice',
};

export const checkSettings = {
  timeout: 90 * 1000,
  iterations: 45,
};
export const faketimeFile = './faketime';
export const chain = {
  url: 'localhost:9944',
};

export const uis = {
  dir: path.resolve(localDir, 'uis'),
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
