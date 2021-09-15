import path from 'path';

export const publicPath = path.resolve(__dirname, 'public');

export const checkSettings = {
  timeout: 60 * 1000,
  iterations: 30,
};

export const chain = {
  url: 'localhost:9944',
  snapshotsDir: path.resolve(publicPath, 'snapshots'),
  chainsDir: path.resolve(publicPath, 'snapshots', 'chains'),
};

export const subquery = {
  url: 'localhost:3002',
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
