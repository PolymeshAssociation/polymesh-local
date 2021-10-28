# polymesh-local

Polymesh local environment for development and e2e testing

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/polymesh-local.svg)](https://npmjs.org/package/polymesh-local)
[![Downloads/week](https://img.shields.io/npm/dw/polymesh-local.svg)](https://npmjs.org/package/polymesh-local)
[![License](https://img.shields.io/npm/l/polymesh-local.svg)](https://github.com/PolymathNetwork/polymesh-local/blob/master/package.json)

Tool for managing a Polymesh development or CI environment. This environment includes 3 Polymesh nodes, a Polymesh specific [SubQuery](https://subquery.network/) instance, its corresponding PostgreSQL instance and tooling-gql, a GraphQL interface to query historic chain data.

This tool is using `docker-compose` internally. This means each service is a container that can be managed like a normal docker container.

_NOTE: This package requires docker to run. It must be installed on the user's system beforehand_

### Getting Started

The easiest way to run polymesh-local is to grab the latest release from npm.

```sh
npm i -g polymesh-local
polymesh-local start
```

The first time can take a while as the various docker images are pulled in. After the initial start it should be much quicker. The full set of commands can be seen with `help` command.

### Building From Source

When developing polymesh-local, commands can be executed with `./bin/run COMMAND`, which will execute the repo's code. It can be packaged and installed locally with:

```sh
yarn build:ts
yarn pack # produces a .tgz file that can be installed
npm i -g polymesh-local-v3.0.0.tgz # specify the file created from previous step
```

<!-- toc -->

- [polymesh-local](#polymesh-local)
- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g polymesh-local
$ polymesh-local COMMAND
running command...
$ polymesh-local (-v|--version|version)
polymesh-local/3.0.0 darwin-arm64 node-v14.17.1
$ polymesh-local --help [COMMAND]
USAGE
  $ polymesh-local COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`polymesh-local clean`](#polymesh-local-clean)
- [`polymesh-local help [COMMAND]`](#polymesh-local-help-command)
- [`polymesh-local info`](#polymesh-local-info)
- [`polymesh-local load FILE`](#polymesh-local-load-file)
- [`polymesh-local ls`](#polymesh-local-ls)
- [`polymesh-local rm FILE`](#polymesh-local-rm-file)
- [`polymesh-local save [name]`](#polymesh-local-save-name)
- [`polymesh-local start [OPTIONS]`](#polymesh-local-start-options)
- [`polymesh-local stop [OPTIONS]`](#polymesh-local-stop-options)

## `polymesh-local clean`

Clean removes the chain data so the next start is starts at a genisis block. Services must be stopped for this command to work

```
USAGE
  $ polymesh-local clean
```

_See code: [src/commands/clean.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.0.0/src/commands/clean.ts)_

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

_See code: [src/commands/info.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.0.0/src/commands/info.ts)_

## `polymesh-local load FILE`

Loads a snapshot into the data directory. Services must be stopped for this command to work

```
USAGE
  $ polymesh-local load FILE
```

_See code: [src/commands/load.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.0.0/src/commands/load.ts)_

## `polymesh-local ls`

Lists current snapshots

```
USAGE
  $ polymesh-local ls
```

_See code: [src/commands/ls.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.0.0/src/commands/ls.ts)_

## `polymesh-local rm FILE`

Removes a snapshot

```
USAGE
  $ polymesh-local rm FILE
```

_See code: [src/commands/rm.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.0.0/src/commands/rm.ts)_

## `polymesh-local save [name]`

Saves current chain state into an archive file

```
USAGE
  $ polymesh-local save [name]

ARGUMENTS
  NAME  A name or path for the snapshot
```

_See code: [src/commands/save.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.0.0/src/commands/save.ts)_

## `polymesh-local start [OPTIONS]`

Start all the services

```
USAGE
  $ polymesh-local start [OPTIONS]

OPTIONS
  -c, --clean
      Cleans state before starting

  -h, --help
      show CLI help

  -i, --image=image
      (Advanced) Specify a local docker image to use for Polymesh containers. Such an image should be debian based and
      have the polymesh node binary set as its entrypoint

  -o, --only=chain|subquery|gql|rest
      [default: chain,subquery,gql,rest] Run only some services

  -s, --snapshot=snapshot
      Loads snapshot before starting. Current state used if not passed

  -v, --version=4.0.0
      [default: 4.0.0] version of the containers to run

  --chain=dev|local|testnet-dev|ci-dev|ci-local|testnet-local|testnet-bootstrap|mainnet-dev|mainnet-local|mainnet-bootst
  rap|mainnet|testnet
      (Advanced) Specify a Polymesh runtime. ci-dev has reduced block times letting it process transactions faster than
      testnet-dev

  --dids=dids
      [default: 0x0600000000000000000000000000000000000000000000000000000000000000] Comma seperated list of dids available
      in the rest api. Defaults to `0x0600000000000000000000000000000000000000000000000000000000000000`

  --mnemonics=mnemonics
      [default: //Alice] Comma seperated list of mnemonics for dids. Defaults to `//Alice`

  --verbose
      enables verbose output
```

_See code: [src/commands/start.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.0.0/src/commands/start.ts)_

## `polymesh-local stop [OPTIONS]`

Stops all services started with the "start" command

```
USAGE
  $ polymesh-local stop [OPTIONS]

OPTIONS
  -c, --clean  Cleans state after stopping
```

_See code: [src/commands/stop.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v3.0.0/src/commands/stop.ts)_

<!-- commandsstop -->
