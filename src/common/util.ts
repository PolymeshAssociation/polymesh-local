import Command from '@oclif/command';
import * as fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';
import semver from 'semver';
import { pipeline } from 'stream';
import { promisify } from 'util';

import { getMetadata, Metadata } from '../common/snapshots';
import {
  chain,
  checkSettings,
  configFileName,
  earliestAssociationHubImages,
  postgres,
  rest,
  tooling,
  uis,
} from '../consts';

/**
 * Values a user can set in a config file to control what images to use
 */
export interface UserConfig {
  chainTag: string;
  toolingTag: string;
  restTag: string;
  subqueryTag: string;
  restMnemonics: string;
  restSigners: string;
}

const millisecondsPerMinute = 60 * 1000;

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
 * Calculates the time a node should set its clock to the next time it starts up by adding its run time to its old start time
 */
export function containerNow(metadata: Metadata): string {
  const startedTime = new Date(metadata.time);
  const upTime = new Date().getTime() - new Date(metadata.startedAt).getTime();
  const newTime = new Date(+startedTime + upTime);
  return dateToFakeTime(newTime);
}

/**
 * @returns The current moment in fake time format
 */
export function hostNow(): string {
  return dateToFakeTime(new Date());
}

/**
 * Converts a JS Date to fake time format
 * @param date to convert
 * @returns string as YYYY-MM-DD HH:MM:SS
 */
function dateToFakeTime(date: Date): string {
  // Adjust the date for the timezone since the TZ gets removed
  const tzAdjusted = new Date(date.getTime() - date.getTimezoneOffset() * millisecondsPerMinute);
  return tzAdjusted.toISOString().replace(/T/, ' ').replace(/\..*$/, '');
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
  cmd.log(`config file was saved at ${configPath} (it can be updated with a text editor)`);
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

/**
 * A helper function that given UserConfig will resolve images based on their tag.
 * This is needed to provide backwards compatibility for polymathnet images
 */
export function resolveContainerImages(userConfig: UserConfig): {
  toolingImage: string;
  restImage: string;
  subqueryImage: string;
} {
  const { toolingTag, restTag, subqueryTag } = userConfig;
  const { toolingVersion, restVersion, subqueryVersion } = earliestAssociationHubImages;
  let toolingImage, restImage, subqueryImage;
  // special case v6.0.0-alpha.1 as the tags got out of order and we used it for older chains
  if (semver.lt(toolingTag, toolingVersion) || toolingTag === 'v6.0.0-alpha.1') {
    toolingImage = `polymathnet/tooling-gql:${toolingTag}`;
  } else {
    toolingImage = `polymeshassociation/polymesh-tooling-gql:${toolingTag}`;
  }

  if (semver.lt(restTag, restVersion)) {
    restImage = `polymathnet/polymesh-rest-api:${restTag}`;
  } else {
    restImage = `polymeshassociation/polymesh-rest-api:${restTag}`;
  }

  if (semver.lt(subqueryTag, subqueryVersion)) {
    subqueryImage = `polymathnet/polymesh-subquery:${subqueryTag}`;
  } else {
    subqueryImage = `polymeshassociation/polymesh-subquery:${subqueryTag}`;
  }

  return {
    toolingImage,
    restImage,
    subqueryImage,
  };
}
