import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import tar from 'tar';
import { Parser } from 'xml2js';

import { downloadFile, returnsExpectedStatus } from '../common/util';
import { localDir, uis } from '../consts';

const xmlParser = new Parser();

export async function areUIsUp(): Promise<boolean> {
  const results = await Promise.all([
    returnsExpectedStatus(`http://${uis.dashboard}`, 200),
    returnsExpectedStatus(`http://${uis.bridge}`, 200),
    returnsExpectedStatus(`http://${uis.issuer}`, 200),
    returnsExpectedStatus(`http://${uis.governance}`, 200),
  ]);

  return results.every(Boolean);
}

/**
 * If the UI directory is empty this will fetch the most recent UI tarball from S3 and unzip it.
 */
export async function fetchUIs(version: string): Promise<void> {
  if (checkVersion(version)) {
    return;
  }

  const fileName = await fetchFileName(version);
  const dest = path.join(localDir, 'uis.tgz');
  const s3Path = `${uis.s3}/${fileName}`;
  await downloadFile(s3Path, dest);

  if (!existsSync(uis.dir)) mkdirSync(uis.dir);

  try {
    await tar.x({
      file: dest,
      C: uis.dir,
    });
  } catch (err) {
    console.error(
      'Could not unzip UIs. Try updating to the latest polymesh-local release. If the problem persists please contact Polymath'
    );
    process.exit(1);
  } finally {
    rmSync(dest); // no need to keep the tar file around
  }
  recordVersion(version);
}

export function clearUIs(): void {
  if (haveUIs()) {
    rmdirSync(uis.dir, { recursive: true });
  }
}

function haveUIs(): boolean {
  return existsSync(uis.dir) && readdirSync(uis.dir).length > 0;
}

interface S3Metadata {
  Key: string[];
  LastModified: string;
}
/**
 * Fetches the most recent UI tarball from the S3 bucket.
 * Uses the REST API since the official S3 client requires credentials
 * @returns The S3 filename of the most recent UI for the given version
 */
async function fetchFileName(version: string): Promise<Record<string, unknown> | void> {
  return fetch(`${uis.s3}/?list-type=2`)
    .then(response => response.text())
    .then(xmlString => xmlParser.parseStringPromise(xmlString))
    .then(response => response?.ListBucketResult?.Contents)
    .then(contents => {
      const mostRecent = contents
        .filter((obj: S3Metadata) => obj.Key[0] !== 'uis/' && obj.Key[0].includes('polymesh-uis')) // filter any non ui file
        .filter((obj: S3Metadata) => obj.Key[0].includes(version)) // filter down for correct version only
        .sort((a: S3Metadata, b: S3Metadata) => {
          return a.LastModified < b.LastModified ? 1 : a.LastModified > b.LastModified ? -1 : 0;
        })[0];
      if (!mostRecent) {
        console.error(
          `UIs were not found for version ${version}. Please contact the polymath team if the problem persists`
        );
        process.exit(1);
      }
      return mostRecent.Key[0];
    });
}

function recordVersion(version: string): void {
  writeFileSync(`${uis.dir}/version.txt`, version);
}

function checkVersion(version: string): boolean {
  if (haveUIs()) {
    const uiVersion = readFileSync(uis.versionFile).toString();
    return uiVersion === version;
  }
  return false;
}
