import { chain, dataDir } from './consts';

export const chainRunningError = `A running chain at ${chain.url} was detected. First use the "stop" command and try this command again`;
export const noData = `${dataDir} does not exist. Either load a snapshot or use "start" to resolve this`;
