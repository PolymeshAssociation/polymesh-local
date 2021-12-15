const { spawn } = require('child_process');

const polymeshPath = '/usr/local/bin/polymesh';
const SECOND = 1000;
const MINUTE = 60 * SECOND;

async function main() {
  if (!process.env.START_TIME) {
    throw new Error('START_TIME environment variable not set');
  }

  const startTimeMs = +process.env.START_TIME;

  const chainArgPrefix = '--chain=';
  const chainArg = process.argv.find(a => a.startsWith(chainArgPrefix));
  let chain = 'dev';

  if (chainArg) {
    chain = chainArg.replace(chainArgPrefix, '');
  }

  const epochDurationMs = chain.startsWith('ci') ? 1 * MINUTE : 30 * MINUTE;
  const fastForwardRate = chain.startsWith('ci') ? ' x100' : ' x3000';
  const blockTimeMs = chain.startsWith('ci') ? 500 : 5 * SECOND;
  await runPolymeshUntilNow(formatFakeTime(startTimeMs) + fastForwardRate);
  /*  
  let stepMs = startTimeMs + epochDurationMs;
  while (stepMs < Date.now()) {
    const t = formatFakeTime(stepMs);
    await runPolymeshUntilBlockEmitted(t, blockTimeMs);
    stepMs += epochDurationMs;
  }
  */
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

const newEpochRegex = /New epoch(?:.|\n)+Imported/gm;
const dateRegex = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g;

function runPolymeshUntilNow(fakeTime, blockTimeMs) {
  const [_, __, ...polymeshArgs] = process.argv;
  const proc = spawn(polymeshPath, polymeshArgs, {
    env: {
      FAKETIME: fakeTime,
      LD_PRELOAD: '/usr/lib/x86_64-linux-gnu/faketime/libfaketime.so.1',
    },
    stdio: 'pipe',
  });
  let killed = false;
  return new Promise(async (resolve, reject) => {
    proc.stderr.on('data', async function (data) {
      data = data.toString();
      console.log(data);
      const dateStr = dateRegex.exec(data);
      if (dateStr && dateStr[0]) {
        try {
          const timestamp = Date.parse(dateStr[0]);
          if (!killed && timestamp >= Date.now()) {
            killed = true;
            proc.kill('SIGINT');
          }
        } catch {}
      }
    });
    proc.stdout.on('data', function (data) {
      console.log(data.toString());
    });
    proc.on('error', reject);

    proc.on('exit', code => {
      if (code != 0) {
        reject(new Error(`polymesh process exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}
// Runs polymesh at the specified fakeTime until a new epoch is finalized, then kills it.
// If waitKill is true, it will wait a few seconds before killing the process to give time for
// the other nodes to finalize as well.
function runPolymeshUntilBlockEmitted(fakeTime, blockTimeMs) {
  const [_, __, ...polymeshArgs] = process.argv;
  const proc = spawn(polymeshPath, polymeshArgs, {
    env: {
      FAKETIME: fakeTime,
      LD_PRELOAD: '/usr/lib/x86_64-linux-gnu/faketime/libfaketime.so.1',
    },
    stdio: 'pipe',
  });
  return new Promise(async (resolve, reject) => {
    let result = '';

    proc.stderr.on('data', async function (data) {
      data = data.toString();
      console.log(data);
      result += data;
      if (newEpochRegex.test(result)) {
        proc.kill('SIGINT');
      }
    });
    proc.stdout.on('data', function (data) {
      console.log(data.toString());
    });
    proc.on('error', reject);

    proc.on('exit', code => {
      if (code != 0) {
        reject(new Error(`polymesh process exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

function formatFakeTime(timestamp) {
  const d = new Date(timestamp);

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

  return `@${year}-${month}-${day} ${hour}:${minute}:${seconds}`;
}

async function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}
