// This script will zip up the UIs directory and upload it to an S3 bucket
// Before invoking this, you should run the build-uis script and test them

import { execSync } from 'child_process';
import path from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs-extra';
import AWS from 'aws-sdk';
import { rmSync } from 'fs';

const uiDir = path.join(__dirname, '..', 'src', 'local', 'uis');

const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

if (!accessKeyId || !secretAccessKey) {
  throw new Error('AWS_ACCESS_KEY and AWS_SECRET_KEY are required');
}

const client = new AWS.S3({
  accessKeyId,
  secretAccessKey,
});

function uploadUis() {
  // use date with TZ info stripped out
  const date = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '');
  const fileName = `${date}-polymesh-uis.tgz`;

  if (!existsSync(uiDir) && readdirSync(uiDir).length > 0) {
    throw new Error(`No contents detected in ${uiDir}`);
  }

  console.log('zipping ui dir');
  execSync(`tar -czvf ${fileName} -C ${uiDir} .`, { stdio: 'ignore' });

  const fileContent = readFileSync(fileName);
  const params = {
    Bucket: 'polymesh-local',
    Key: `uis/${fileName}`,
    Body: fileContent,
    ACL: 'public-read',
  };

  console.log('beggining UI upload');
  client.upload(params, {}, err => {
    rmSync(fileName);
    if (err) {
      console.error(`Error uploading UIs: ${err}`);
    } else {
      console.log(`uploaded ${fileName} successfully`);
    }
  });
}

uploadUis();
