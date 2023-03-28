import { returnsExpectedStatus } from '../common/util';
import { subquery } from '../consts';

export async function isGraphQlUp(): Promise<boolean> {
  const query = `query {
    blocks(first: 1) {
      totalCount
    }
   }`;

  const headers = { 'Content-Type': 'application/json' };
  const body = JSON.stringify({ query });

  const result = await returnsExpectedStatus(`http://${subquery.graphql}`, 200, body, headers);

  return result;
}
