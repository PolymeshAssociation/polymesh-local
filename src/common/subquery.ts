import { retryCheck } from '../common/util';
import { subquery } from '../consts';

export async function isSubqueryUp(): Promise<boolean> {
  return retryCheck(`http://${subquery.url}/meta`, 200);
}
