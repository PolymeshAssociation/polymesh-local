# polymesh-local

Polymesh local environment for development and e2e testing

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/polymesh-local.svg)](https://npmjs.org/package/polymesh-local)
[![Downloads/week](https://img.shields.io/npm/dw/polymesh-local.svg)](https://npmjs.org/package/polymesh-local)
[![License](https://img.shields.io/npm/l/polymesh-local.svg)](https://github.com/PolymathNetwork/polymesh-local/blob/master/package.json)

Tool for managing a Polymesh development or CI environment. This environment includes 3 Polymesh nodes, a Polymesh specific [SubQuery](https://subquery.network/) instance, its corresponding PostgreSQL instance and tooling-gql, a GraphQL interface to query historic chain data.

This tool is using `docker-compose` internally. This means each service is a container that can be managed like a normal docker container.

_NOTE: This package requires docker to run. It must be installed on the user's system beforehand_

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
polymesh-local/1.2.0 linux-x64 node-v14.17.6
$ polymesh-local --help [COMMAND]
USAGE
  $ polymesh-local COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`polymesh-local help [COMMAND]`](#polymesh-local-help-command)
* [`polymesh-local info`](#polymesh-local-info)
* [`polymesh-local save `](#polymesh-local-save)
* [`polymesh-local start [OPTIONS]`](#polymesh-local-start-options)
* [`polymesh-local stop [OPTIONS]`](#polymesh-local-stop-options)

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

prints service connection information

```
USAGE
  $ polymesh-local info
```

_See code: [src/commands/info.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v1.2.0/src/commands/info.ts)_

## `polymesh-local save `

saves current chain state into a tarball

```
USAGE
  $ polymesh-local save

OPTIONS
  -o, --output=output  path for saving the snapshot too
```

_See code: [src/commands/save.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v1.1.0/src/commands/save.ts)_

## `polymesh-local start [OPTIONS]`

start all containers

```
USAGE
  $ polymesh-local start [OPTIONS]

OPTIONS
  -c, --cleanStart         Brings up a fresh environment with no data. Skips the snapshot importing step
  -h, --help               show CLI help

  -s, --snapshot=snapshot  path to the snapshot to use. If no file is passed, the default snapshot for the selected
                           version is used

  -v, --version=3.2.0      [default: 3.2.0] version of the containers to run

  --verbose                enables verbose output
```

_See code: [src/commands/start.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v1.2.0/src/commands/start.ts)_

## `polymesh-local stop [OPTIONS]`

stop all containers started with the "start" command

```
USAGE
  $ polymesh-local stop [OPTIONS]

OPTIONS
  --verbose  enables verbose output
```

_See code: [src/commands/stop.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v1.2.0/src/commands/stop.ts)_
<!-- commandsstop -->
