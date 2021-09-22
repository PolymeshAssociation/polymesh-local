import { chain } from '../../src/consts';
import { returnsExpectedStatus } from '../common/util';

export async function isChainUp(): Promise<boolean> {
  return returnsExpectedStatus(`http://${chain.url}`, 400);
}
