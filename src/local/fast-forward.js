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

  const epochDurationMs = chain.startsWith('ci') ? MINUTE : 30 * MINUTE;
  const blockTimeMs = chain.startsWith('ci') ? 500 : 5 * SECOND;

  const timeDeltaMs = Date.now() - startTimeMs;
  const missingEpochs = Math.floor(timeDeltaMs / epochDurationMs);

  for (let i = 0; i < missingEpochs; i++) {
    const t = formatFakeTime(startTimeMs + i * epochDurationMs);
    await runPolymeshUntilBlockEmitted(t, blockTimeMs);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

const newEpochRegex = /New epoch(?:.|\n)+Pre-sealed block for proposal(?:.|\n)+Imported/gm;

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
    stdio: 'inherit',
  });
  return new Promise(async (resolve, reject) => {
    const result = '';
    /*
    proc.stderr.on('data', async function (data) {
      data = data.toString();
      console.log(data);
      result += data;
      if (newEpochRegex.test(result)) {
        if (waitKill) {
          //give other processes time in the last iteration to catch up
          await sleep(10000);
        }
        proc.kill();
        resolve();
      }
    });
    proc.stdout.on('data', function (data) {
      console.log(data.toString());
    });
    */
    proc.on('error', reject);
    proc.on('exit', code => {
      reject(new Error(`polymesh process exited with code ${code}`));
    });
    await sleep(blockTimeMs * 10);
    proc.kill();
    resolve();
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
