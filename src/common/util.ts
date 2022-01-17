import Command from '@oclif/command';
import * as fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

import { getMetadata, Metadata } from '../common/snapshots';
import { chain, checkSettings, configFileName, postgres, rest, tooling, uis } from '../consts';

/**
 * Values a user can set in a config file to control what images to use
 */
export interface UserConfig {
  chainTag: string;
  toolingTag: string;
  restTag: string;
  subqueryTag: string;
  restMnemonics: string;
  restDids: string;
}

const millisecondsPerMinute = 60 * 1000;

export async function sleep(time: number): Promise<void> {
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
  const metadata = getMetadata();
  const configLocation = path.join(cmd.config.configDir, configFileName);
  if (fs.existsSync(configLocation)) {
    cmd.log(`config file located at: ${configLocation}`);
  }
  cmd.log(`chain version ${metadata.version} running`);
  cmd.log(`polymesh node listening at wss://${chain.url}`);
  cmd.log(`postgreSQL listening at postgresql://localhost:${postgres.port}`);
  cmd.log(`dashboard UI listening at http://${uis.dashboard}`);
  cmd.log(`bridge UI listening at http://${uis.bridge}`);
  cmd.log(`issuer UI listening at http://${uis.issuer}`);
  cmd.log(`governance UI listening at http://${uis.governance}`);
  cmd.log(`rest API listening at http://${rest.url}`);
  cmd.log(`tooling-gql listening at http://${tooling.url}.`);
  cmd.log(`  note: tooling-gql requests need a header of: \`x-api-key: ${tooling.apiKey}\` set`);
}

/**
 * Fetches a file from a url and saves it to disk
 * @param url The URL to download from
 * @param dest The path to save the file to
 */
export async function downloadFile(url: string, dest: string): Promise<void> {
  await promisify(pipeline)((await fetch(url)).body, fs.createWriteStream(dest));
}

/**
 * Converts a JS Date to fake time format
 * @param date to convert
 * @returns string as YYYY-MM-DD HH:MM:SS
 */
export function dateToFaketime(d: Date): string {
  return formatDate(d, ' ');
}

/**
 * Converts a JS Date to filename format
 * @param date to convert
 * @returns string as YYYY-MM-DD_HH:MM:SS
 */
export function dateToFilename(d: Date): string {
  return formatDate(d, '_');
}

function formatDate(d: Date, separator: string) {
  let month = '' + (d.getUTCMonth() + 1);
  let day = '' + d.getUTCDate();
  const year = d.getUTCFullYear();
  let hour = '' + d.getUTCHours();
  let minute = '' + d.getUTCMinutes();
  let seconds = '' + d.getUTCSeconds();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  if (hour.length < 2) hour = '0' + hour;
  if (minute.length < 2) minute = '0' + minute;
  if (seconds.length < 2) seconds = '0' + seconds;

  return `${year}-${month}-${day}${separator}${hour}:${minute}:${seconds}`;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
export function epochDuration(c: string): number {
  return c.startsWith('ci') ? MINUTE : 30 * MINUTE;
}

/**
 * Reads user config settings
 * @param cmd
 * @returns user config if set, otherwise null
 */
export async function getUserConfig(cmd: Command): Promise<UserConfig | null> {
  const configPath = path.join(cmd.config.configDir, configFileName);
  if (fs.existsSync(configPath)) {
    return fs.readJSON(configPath);
  } else {
    return null;
  }
}

export function saveUserConfig(cmd: Command, config: UserConfig): void {
  const configPath = path.join(cmd.config.configDir, configFileName);
  fs.mkdirpSync(cmd.config.configDir);
  const contents = JSON.stringify(config, undefined, 2);
  fs.writeFileSync(configPath, contents);
  cmd.log(`config file was saved at ${configPath}`);
}

interface DockerTag {
  name: string;
}

interface DockerTagResponse {
  next?: string;
  results: DockerTag[];
}
/**
 * Fetches docker hub tags for a given repo
 * @param repo The repo to fetch tags for
 * @returns available tags
 */
export async function fetchDockerHubTags(repo: string): Promise<DockerTag[]> {
  const options = [];
  let response: DockerTagResponse = { results: [] };
  do {
    const url =
      response?.next ||
      `https://registry.hub.docker.com/v2/repositories/${repo}/tags/?${new URLSearchParams({
        page_size: '100',
      })}`;
    const rawResponse = await fetch(url);
    response = await rawResponse.json();
    options.push(
      ...response.results.map(r => {
        return { name: r.name };
      })
    );
  } while (response?.next);

  return options;
}
