import path from 'path';

export const publicPath = path.resolve(__dirname, 'public');
export const snapshotsPath = path.resolve(publicPath, 'snapshots');
export const chainNetworkData = {
  host: 'localhost',
  port: '9944',
};
