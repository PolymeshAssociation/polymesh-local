import path from 'path';

export const publicPath = path.resolve(__dirname, 'public');
export const snapshotsDir = path.resolve(publicPath, 'snapshots');
export const chainsPath = `${snapshotsDir}/chains`;
export const chainNetworkData = {
  host: 'localhost',
  port: '9944',
};
