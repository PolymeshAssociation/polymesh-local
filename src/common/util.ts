import Command from '@oclif/command';
import { execSync } from 'child_process';
import fetch from 'node-fetch';

import { chain, checkSettings, dateFmt, postgres, tooling } from '../consts';

async function sleep(time: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, time));
}

/**
 * Repeatedly call an async check function until it returns true. Returns true when the check function
 *   returns true. Returns false if the check hasn't returned true after a certain number of retries, or after
 *   a specific time has passed
 */
export async function retry(check: () => Promise<boolean>): Promise<boolean> {
  const { timeout, iterations } = checkSettings;
  const startTime = new Date().getTime();
  for (let i = 0; i < iterations; i += 1) {
    if (await check()) {
      return true;
    } else if (new Date().getTime() - startTime > timeout) {
      return false;
    }
    await sleep(2000);
  }
  return false;
}

export async function returnsExpectedStatus(
  url: string,
  expectedStatus: number,
  body: string | undefined = undefined,
  headers: Record<string, string> | undefined = undefined
): Promise<boolean> {
  const method = body ? 'POST' : 'GET';
  const { status } = await fetch(url, {
    method,
    headers,
    body,
  }).catch(err => {
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
      return { status: 0 };
    }
    throw err;
  });
  return status === expectedStatus;
}

export function printInfo(cmd: Command): void {
  cmd.log(`polymesh node listening at wss://${chain.url}`);
  cmd.log(`postgreSQL listening at postgresql://localhost:${postgres.port}`);
  cmd.log(`tooling-gql listening at http://${tooling.url}.`);
  cmd.log(`  note: tooling-gql requests need a header of: \`x-api-key: ${tooling.apiKey}\` set`);
}

export function hostTime(): string {
  return execSync(`date "${dateFmt}"`).toString().trim();
}
