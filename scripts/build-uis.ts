// This script will pull the latesst Polymesh uis, build them and place them in the uis directory
// Some of these are private repos. Git needs an SSH key with access for this to work
// To upload them to the S3, use the upload-uis script

import { execSync } from 'child_process';
import { rmdirSync } from 'fs';
import { mkdirSync, existsSync } from 'fs-extra';
import path from 'path';
const uiDir = path.join(__dirname, '..', 'src', 'local', 'uis');
const tmpDir = path.join(__dirname, 'tmp');

if (existsSync(tmpDir)) {
  rmdirSync(tmpDir, { recursive: true });
}

mkdirSync(tmpDir);

const apps: Record<string, string> = {
  dashboard: 'git@github.com:PolymathNetwork/dashboard-app.git',
  bridge: 'git@github.com:PolymeshAssociation/bridge-ui.git',
  governance: 'git@github.com:PolymathNetwork/governance-web.git',
  issuer: 'git@github.com:PolymathNetwork/Polymesh-Issuer.git',
};

const ports: Record<string, string> = {
  dashboard: '3000',
  bridge: '3001',
  governance: '3002',
  issuer: '3003',
};

// Config needed for the react apps. Name + URL set individually
const envs: Record<string, string> = {
  REACT_APP_ENV: 'production',
  REACT_APP_INCLUDE_ANALYTICS: 'false',
  REACT_APP_TOKEN_SYMBOL: 'POLYX',
  REACT_APP_KEY_LABEL_STORAGE: 'poly_keylabels',
  REACT_APP_APPCUES_EVENT: 'proposal_created_or_voted',
  REACT_APP_PROPOSAL_YES_THRESHOLD: '50',
  REACT_APP_TREASURY_ACCOUNT: '5EYCAe5ijAx5xEfZdpCna3grUpY1M9M5vLUH5vpmwV1EnaYR',
  REACT_APP_GQL_API_KEY: 'd41d8cd98f00b204e9800998ecf8427e',

  // application level links
  REACT_APP_POLY_WSS_NODE_URL: 'ws://localhost:9944',
  REACT_APP_BRIDGE_UI_URL: 'http://localhost:3001',
  REACT_APP_GOVERNANCE_URL: 'http://localhost:3002',
  REACT_APP_TOKEN_STUDIO_URL: 'http://localhost:3003',
  REACT_APP_GQL_ENDPOINT: 'http://localhost:3007/graphql',
  REACT_APP_GQL_URL: 'http://localhost:3007/graphql',
  REACT_APP_NODE_URL: 'ws://localhost:9944',
  REACT_APP_HTTP_URL: 'http://localhost:9933/',
  REACT_APP_POLY_RPC_URL: 'http://localhost:9933',
  // People can use the explorer to send testUtils/mockCddRegisterDid to create a CDD
  REACT_APP_REGISTER_CDD_URL:
    'https://app.polymesh.live/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/extrinsics',

  // Documentation links
  REACT_APP_WALLET_URL:
    'https://chrome.google.com/webstore/detail/polymesh-wallet/jojhfeoedkpkglbfimdfabpdfjaoolaf?hl=en',
  REACT_APP_PRIVACY_URL: 'https://polymath.network/polymesh-testnet/privacy-policy',
  REACT_APP_TERMS_URL: 'https://polymath.network/polymesh-testnet/polymesh-terms',
  REACT_APP_TESTNET_DISCLAIMER: 'https://polymath.network/polymesh-testnet/disclaimer',
  REACT_APP_EDU_PAGE_URL: 'https://polymath.network/polymesh-testnet/key-and-id-assignments',
  REACT_APP_TXFAIL_URL: 'https://polymath.network/polymesh-testnet/failedtrxns',
  REACT_APP_POLYMESH_TOKENOMICS_URL:
    'https://info.polymath.network/blog/introduction-to-polymesh-tokenomics?utm_campaign=Testnet&utm_source=dApp&utm_medium=staking-ui',
  REACT_APP_STAKING_DISTRIBUTION_INFO_URL:
    'https://community.polymesh.live/hc/en-us/articles/360021500879-How-is-my-stake-distributed-across-node-operators-',
  REACT_APP_VOTE_FAILED_URL: 'https://polymath.network/polymesh-testnet/failedtrxns',
  REACT_APP_PROPOSAL_BEST_PRACTICES_URL:
    'https://blog.polymath.network/best-practices-creating-proposals-polymesh-governance-ff1d68d8dbe9',
  REACT_APP_APP_FEATURE_REQUEST_URL:
    'https://community.polymesh.live/hc/en-us/community/topics/115000267314-Feature-Requests',

  // Unset variables for polymesh-local
  REACT_APP_SENTRY_DSN: '',
  REACT_APP_BLOCK_EXPLORER: '#',
  REACT_APP_FRACTAL_URL: '#',
  REACT_APP_EXPLORER_URL: '#',
  REACT_APP_GTM_ID: '',
  REACT_APP_SENTRY_DS: '',

  SKIP_PREFLIGHT_CHECK: 'true', // disables eslint preventing errors from conflicting versions
};

export function buildRepos() {
  for (const app in apps) {
    const url = apps[app];
    console.log(`Building: ${app}`);
    const repoPath = path.join(tmpDir, app);
    execSync(`git clone ${url} ${app}`, { cwd: tmpDir });
    execSync('yarn', { cwd: repoPath });
    execSync('yarn build', {
      env: {
        ...process.env,
        ...envs,
        REACT_APP_APP_URL: `http://localhost:${ports[app]}`,
        REACT_APP_APP_NAME: `Polymesh ${app}`,
      },
      cwd: path.join(tmpDir, app),
    });

    const from = path.join(repoPath, 'build');
    const to = path.join(uiDir, app);
    rmdirSync(to, { recursive: true });
    execSync(`mv ${from} ${to}`);
  }
}

function main() {
  console.log('Creating Polymesh UIs');
  buildRepos();
}

main();
