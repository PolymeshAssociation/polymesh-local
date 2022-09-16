import { returnsExpectedStatus } from '../common/util';
import { tooling } from '../consts';

export async function isToolingUp(): Promise<boolean> {
  const query = `query {
    latestBlock { id }
   }`;

  const headers = { 'Content-Type': 'application/json', 'x-api-key': tooling.apiKey };
  const body = JSON.stringify({ query });

  // tooling changed its route, we check both as it is simpler than getting what version is being used here
  const result = await Promise.all([
    returnsExpectedStatus(`http://${tooling.url}`, 200, body, headers),
    returnsExpectedStatus(`http://${tooling.oldUrl}`, 200, body, headers),
  ]);
  return result[0] || result[1];
}
