# polymesh-local

Polymesh local environment for development and e2e testing

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/polymesh-local.svg)](https://npmjs.org/package/polymesh-local)
[![Downloads/week](https://img.shields.io/npm/dw/polymesh-local.svg)](https://npmjs.org/package/polymesh-local)
[![License](https://img.shields.io/npm/l/polymesh-local.svg)](https://github.com/PolymathNetwork/polymesh-local/blob/master/package.json)

Tool for managing a Polymesh development or CI environment. This environment includes:

- 3 Polymesh nodes (ws on :9944)
- A Polymesh [SubQuery](https://subquery.network/) instance
- A PostgreSQL instance (Served on :5432)
- Rest API for interacting with the chain (Served on :3004)
- Polymesh UIs (Dashboard on :3000, Bridge on :3001, Token Studio on :3002, Governance on :3003)
- Tooling-gql, a GraphQL interface to query historic chain data. (Served on :3007)

Individual pieces can be brought up by using the `--only` flag on start

_NOTE: This package requires docker and docker-compose to run. They must be installed on the user's system beforehand_

### Getting Started

The easiest way to run polymesh-local is to grab the latest release from npm.

```sh
npm i -g polymesh-local
polymesh-local start
```

The first time can take a while as the various docker images are pulled in. After the initial start it should be much quicker. The full set of commands can be seen with `help` command.

### Creating a CDD + uID

In order to interact with the UIs you will need the [Polymesh wallet](https://chrome.google.com/webstore/detail/polymesh-wallet/jojhfeoedkpkglbfimdfabpdfjaoolaf?hl=en) browser extension installed, as well as a CDD + uID claim for your account.

To create a CDD claim you can use [https://app.polymesh.live/](https://app.polymesh.live/?rpc=ws%3A%2F%2F127.0.0.1%3A9944), add in your wallet address in Addresses > Address Book. Then navigate to Developer > Extrinsics. There select `testUtils` > `mockCddRegisterDid` and select your account. After a CDD has been generated you can use the [mock uID provider](https://polymathnetwork.github.io/mock-uid-provider/) to add a uID claim to your wallet.

After creating the CDD claim you will likely want to transfer POLYX from Alice to your account as well. This can be done in app.polymesh.live under Accounts > Transfer.

### Building From Source

When developing polymesh-local, commands can be executed with `./bin/run COMMAND`, which will execute the repo's code. It can be packaged and installed locally with:

```sh
yarn build:ts
yarn pack # produces a .tgz file that can be installed
npm i -g polymesh-local-v3.0.0.tgz # specify the file created from previous step
```

<!-- toc -->
* [polymesh-local](#polymesh-local)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g polymesh-local
$ polymesh-local COMMAND
running command...
$ polymesh-local (-v|--version|version)
polymesh-local/3.2.0 linux-x64 node-v14.18.1
$ polymesh-local --help [COMMAND]
USAGE
  $ polymesh-local COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`polymesh-local clean`](#polymesh-local-clean)
* [`polymesh-local help [COMMAND]`](#polymesh-local-help-command)
* [`polymesh-local info`](#polymesh-local-info)
* [`polymesh-local load FILE`](#polymesh-local-load-file)
* [`polymesh-local ls`](#polymesh-local-ls)
* [`polymesh-local rm FILE`](#polymesh-local-rm-file)
* [`polymesh-local save [name]`](#polymesh-local-save-name)
* [`polymesh-local start [OPTIONS]`](#polymesh-local-start-options)
* [`polymesh-local stop [OPTIONS]`](#polymesh-local-stop-options)

## `polymesh-local clean`

Clean removes the chain data so the next start is starts at a genisis block. Services must be stopped for this command to work

```
USAGE
  $ polymesh-local clean
```

_See code: [src/commands/clean.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.2.0/src/commands/clean.ts)_

## `polymesh-local help [COMMAND]`

display help for polymesh-local

```
USAGE
  $ polymesh-local help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_

## `polymesh-local info`

Prints service connection information

```
USAGE
  $ polymesh-local info
```

_See code: [src/commands/info.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.2.0/src/commands/info.ts)_

## `polymesh-local load FILE`

Loads a snapshot into the data directory. Services must be stopped for this command to work

```
USAGE
  $ polymesh-local load FILE
```

_See code: [src/commands/load.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.2.0/src/commands/load.ts)_

## `polymesh-local ls`

Lists current snapshots

```
USAGE
  $ polymesh-local ls
```

_See code: [src/commands/ls.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.2.0/src/commands/ls.ts)_

## `polymesh-local rm FILE`

Removes a snapshot

```
USAGE
  $ polymesh-local rm FILE
```

_See code: [src/commands/rm.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.2.0/src/commands/rm.ts)_

## `polymesh-local save [name]`

Saves current chain state into an archive file

```
USAGE
  $ polymesh-local save [name]

ARGUMENTS
  NAME  A name or path for the snapshot
```

_See code: [src/commands/save.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.2.0/src/commands/save.ts)_

## `polymesh-local start [OPTIONS]`

Start all the services

```
USAGE
  $ polymesh-local start [OPTIONS]

OPTIONS
  -C, 
  --chain=dev|local|testnet-dev|ci-dev|ci-local|testnet-local|testnet-bootstrap|mainnet-dev|mainnet-local|mainnet-bootst
  rap|mainnet|testnet
      (Advanced) Specify a Polymesh runtime. ci-dev has reduced block times letting it process transactions faster than 
      testnet-dev

  -c, --clean
      Cleans state before starting

  -h, --help
      show CLI help

  -i, --image=image
      (Advanced) Specify a local docker image to use for Polymesh containers. Such an image should be debian based and 
      have the polymesh node binary set as its entrypoint

  -o, --only=chain|subquery|gql|rest|uis
      [default: chain,subquery,gql,rest,uis] Run only some services

  -s, --snapshot=snapshot
      Loads snapshot before starting. Current state used if not passed

  -u, --uiLatest
      Clears saved UIs so the latest can be fetched

  -v, --version=4.0.0
      [default: 4.0.0] version of the containers to run

  --dids=dids
      [default: 0x0600000000000000000000000000000000000000000000000000000000000000] Comma seperated list of dids available 
      in the rest api. Defaults to `0x0600000000000000000000000000000000000000000000000000000000000000`

  --mnemonics=mnemonics
      [default: //Alice] Comma seperated list of mnemonics for dids. Defaults to `//Alice`

  --verbose
      enables verbose output
```

_See code: [src/commands/start.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.2.0/src/commands/start.ts)_

## `polymesh-local stop [OPTIONS]`

Stops all services started with the "start" command

```
USAGE
  $ polymesh-local stop [OPTIONS]

OPTIONS
  -c, --clean  Cleans state after stopping
```

_See code: [src/commands/stop.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.2.0/src/commands/stop.ts)_
<!-- commandsstop -->
