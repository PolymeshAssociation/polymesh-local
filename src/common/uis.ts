import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import path from 'path';
import tar from 'tar';

import { downloadFile, returnsExpectedStatus } from '../common/util';
import { localDir, uis } from '../consts';

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
export async function fetchUIs(imageVersion: string): Promise<void> {
  const version = parseVersion(imageVersion);
  if (isVersionDownloaded(version)) {
    return;
  }

  const sourcePath = `${uis.remoteAssets}${version}-uis.tgz`;
  const destinationPath = path.join(localDir, 'uis.tgz');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await downloadFile(sourcePath, destinationPath).catch(async _ => {
    console.log(
      `Could not find UIs specific to version ${imageVersion}. Checking for latest UIs now`
    );
    await downloadFile(`${uis.remoteAssets}latest-uis.tgz`, destinationPath);
  });

  if (!existsSync(uis.dir)) mkdirSync(uis.dir);

  try {
    await tar.x({
      file: destinationPath,
      C: uis.dir,
    });
  } catch (err) {
    console.error(
      'Could not unzip UIs. Try updating to the latest polymesh-local release. If the problem persists please contact Polymath'
    );
    process.exit(1);
  } finally {
    rmSync(destinationPath); // no need to keep the tar file around
  }
  recordVersion(version);
}

/**
 * @return patch agnostic version from the given path
 */
function parseVersion(imageVersion: string): string {
  if (imageVersion === 'latest') {
    return 'latest';
  }
  const versionRegex = /(\d+\.\d+)/;
  const versionMatch = imageVersion.match(versionRegex);
  if (!versionMatch) {
    // this can happen if an unofficial image being used. Ideally we'd have "exclude" and say `--exclude ui`
    throw new Error(
      `Could not extract version from: ${imageVersion}. The image should have a semver sequence in it. You can try with starting with "--only chain" to avoid this check`
    );
  }
  return `v${versionMatch[0]}.x`;
}

export function clearUIs(): void {
  if (haveUIs()) {
    rmdirSync(uis.dir, { recursive: true });
  }
}

function haveUIs(): boolean {
  return existsSync(uis.dir) && readdirSync(uis.dir).length > 0;
}

function recordVersion(version: string): void {
  writeFileSync(`${uis.dir}/version.txt`, version);
}

function isVersionDownloaded(version: string): boolean {
  if (haveUIs()) {
    const uiVersion = readFileSync(uis.versionFile).toString();
    return uiVersion === version;
  }
  return false;
}
