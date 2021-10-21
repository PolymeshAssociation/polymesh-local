import { dataDir } from './consts';

export const chainRunningError =
  'A running service was detected. First use the "stop" command and try this command again';
export const noData = `${dataDir} does not exist. Either load a snapshot or use "start" to resolve this`;
export const restArgsError =
  'DIDs and Mnemonics must have the same amount of comma seperated values';
