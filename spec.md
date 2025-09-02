# wrk

`wrk` is a minimal cli written in Bun. It allows the user to quickly open projects in an of their choice IDE (configurable). The projects are located at a specific location (configured on first use).

## Commands

-  `wrk [name]` => open a project in `$WORKSPACE/<name>-work`
   -  This command should pop up a selection interface that lists all projects in `$WORKSPACE/<name>-work`
   -  If no name is provided, the command should open the last project the user worked on
   -  If `$WORKSPACE/<name>-work` is not found, the command should prompt the user if they want to create the `$WORKSPACE/<name>-work` and create a project in it
-  `wrk create [name]` => create a new project dir in `$WORKSPACE/<name>-work`

The core idea here is that all projects accessible through `wrk` are located within subdirs of `$WORKSPACE`. The subdirs of `$WORKSPACE` each represent a coherent set of projects (for example, a workplace or freelancer's client, etc). The subdirs in `$WORKSPACE` are named with a prefix of `-work` (for example,`$WORKSPACE/client-work`, etc).

## Configuration

Configuration should be through a JSON file located at `$XDG_CONFIG_HOME/wrk/config.json`.

-  `workspace` => the location of the projects
-  `ide` => the IDE to use to open the projects (default: `cursor`)

## Guidelines

-  Use Bun instead of Node.js, npm, pnpm, or vite.
-  Use as many built in Bun features as possible, minimize dependencies.
-  Create single executable that is installable in the user's `$PATH`.
