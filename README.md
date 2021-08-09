polymesh-local
==============

Polymesh local environment for development and e2e testing

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/polymesh-local.svg)](https://npmjs.org/package/polymesh-local)
[![Downloads/week](https://img.shields.io/npm/dw/polymesh-local.svg)](https://npmjs.org/package/polymesh-local)
[![License](https://img.shields.io/npm/l/polymesh-local.svg)](https://github.com/PolymathNetwork/polymesh-local/blob/master/package.json)

<!-- toc -->
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
polymesh-local/0.0.0 darwin-x64 node-v14.17.0
$ polymesh-local --help [COMMAND]
USAGE
  $ polymesh-local COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`polymesh-local hello [FILE]`](#polymesh-local-hello-file)
* [`polymesh-local help [COMMAND]`](#polymesh-local-help-command)

## `polymesh-local hello [FILE]`

describe the command here

```
USAGE
  $ polymesh-local hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ polymesh-local hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/PolymathNetwork/polymesh-local/blob/v0.0.0/src/commands/hello.ts)_

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
<!-- commandsstop -->
