import { returnsExpectedStatus } from '../common/util';
import { subquery } from '../consts';

export async function isSubqueryUp(): Promise<boolean> {
  return returnsExpectedStatus(`http://${subquery.url}/meta`, 200);
}
