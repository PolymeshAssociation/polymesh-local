import { returnsExpectedStatus } from '../common/util';
import { chain } from '../consts';

export async function isChainUp(): Promise<boolean> {
  return returnsExpectedStatus(`http://${chain.url}`, 400);
}
