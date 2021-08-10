# polymesh-local

Polymesh local environment for development and e2e testing

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/polymesh-local.svg)](https://npmjs.org/package/polymesh-local)
[![Downloads/week](https://img.shields.io/npm/dw/polymesh-local.svg)](https://npmjs.org/package/polymesh-local)
[![License](https://img.shields.io/npm/l/polymesh-local.svg)](https://github.com/PolymathNetwork/polymesh-local/blob/master/package.json)

<!-- toc -->

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
polymesh-local/1.0.1 linux-x64 node-v14.17.4
$ polymesh-local --help [COMMAND]
USAGE
  $ polymesh-local COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`polymesh-local help [COMMAND]`](#polymesh-local-help-command)
- [`polymesh-local start [OPTIONS]`](#polymesh-local-start-options)
- [`polymesh-local stop`](#polymesh-local-stop)

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

## `polymesh-local start [OPTIONS]`

start all containers

```
USAGE
  $ polymesh-local start [OPTIONS]

OPTIONS
  -h, --help               show CLI help
  -s, --snapshot=snapshot  path to a custom snapshot file

  -t, --timeout=timeout    [default: 60] maximum amount of seconds to wait for the local node to be able to receive
                           connections

  -v, --version=version    [default: 3.0.0] version of the containers to run
```

_See code: [src/commands/start.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v1.0.1/src/commands/start.ts)_

## `polymesh-local stop`

stop all containers started with the "start" command

```
USAGE
  $ polymesh-local stop
```

_See code: [src/commands/stop.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v1.0.1/src/commands/stop.ts)_

<!-- commandsstop -->
