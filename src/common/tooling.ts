import { returnsExpectedStatus } from '../common/util';
import { tooling } from '../consts';

export async function isToolingUp(): Promise<boolean> {
  const query = `query {
    latestBlock { id }
   }`;
  const headers = { 'Content-Type': 'application/json', 'x-api-key': tooling.apiKey };
  const body = JSON.stringify({ query });
  return returnsExpectedStatus(`http://${tooling.url}`, 200, body, headers);
}
