import fetch from 'node-fetch';

import { checkSettings } from '../consts';

async function sleep(time: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, time));
}

export async function retryCheck(
  url: string,
  expectedStatus: number,
  body: string | undefined = undefined,
  headers: Record<string, string> | undefined = undefined
): Promise<boolean> {
  const { timeout, iterations } = checkSettings;
  const startTime = new Date().getTime();
  for (let i = 0; i < iterations; i += 1) {
    if (await check(url, expectedStatus, body, headers)) {
      return true;
    } else if (new Date().getTime() - timeout > startTime) {
      return false;
    }
    await sleep(2000);
  }
  return false;
}

export async function check(
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
