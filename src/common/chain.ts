import { returnsExpectedStatus } from '../common/util';
import { chain } from '../consts';

export async function isChainUp(): Promise<boolean> {
  return (
    (await returnsExpectedStatus(`http://${chain.url}`, 400)) || // v5.0 returns 400
    (await returnsExpectedStatus(`http://${chain.url}`, 405)) // v6.0 returns 405
  );
}
