import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync } from 'fs';
import fetch from 'node-fetch';
import path from 'path';
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

export async function fetchUIs(): Promise<void> {
  if (haveUIs()) {
    return;
  }

  const fileName = await fetchList();
  const dest = path.join(localDir, 'uis.tgz');
  const s3Path = `${uis.s3}/${fileName}`;
  await downloadFile(s3Path, dest);

  if (!existsSync(uis.dir)) mkdirSync(uis.dir);

  try {
    execSync(`tar -xf '${dest}' -C ${uis.dir}`);
  } catch (err) {
    console.error(
      'Could not unzip UIs. Try updating to the latest polymesh-local release. If the problem persists please contact Polymath'
    );
    process.exit(1);
  } finally {
    rmSync(dest); // no need to keep the tar file around
  }
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
 * @returns The S3 filename of the most recent UI
 */
async function fetchList(): Promise<Record<string, unknown> | void> {
  return fetch(`${uis.s3}/?list-type=2`)
    .then(response => response.text())
    .then(xmlString => xmlParser.parseStringPromise(xmlString))
    .then(response => response?.ListBucketResult?.Contents)
    .then(contents => {
      const mostRecent = contents
        .filter((obj: S3Metadata) => obj.Key[0] !== 'uis/')
        .sort((a: S3Metadata, b: S3Metadata) => {
          return a.LastModified < b.LastModified ? 1 : a.LastModified > b.LastModified ? -1 : 0;
        })[0];
      return mostRecent.Key[0];
    });
}
