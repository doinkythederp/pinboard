# Pinboard

A starboard bot for Discord

## Config

The Pinboard config file is stored in `./pinboard.toml`.

```toml
# used to login to discord
token = "some.bot.token"

# used for error reporting - https://sentry.io/
# OPTIONAL
sentryDSN = "https://your.dsn@ingest.sentry.io"

# controls if the bot is in development mode
# OPTIONAL (default: true)
development = false

[logger]
# used to force colors on/off instead of having
# pinboard detect the environment
# OPTIONAL
colors = true

# log output will also be put in this file instead
# of just stdout
# OPTIONAL
logFile = "./pinboard.log"

[deploy]
# used to force commands to update instead of
# having pinboard detect if they are outdated
# OPTIONAL (default: false)
force = false

# used to post ALL commands to the dev server
# instead of only commands restricted to devs
# OPTIONAL (default: false)
treatDevAsGlobal = false
```

## Setup & Hosting

Requirements:

- Node.js `>= 17`
  - `>= 16.6` _might_ work but is unsupported.
- An `npm`-based package manager
  - Recommended: `pnpm`

### Installing Dependencies

Pinboard has external dependencies (`discord.js`, etc.) that must be installed.

```console
$ pnpm install
```

### Compiling

Pinboard is written in TypeScript and must be compiled in order to be run.

```console
$ pnpm build
```

### Running

This is the part where stuff actually happens! Put your token in `pinboard.toml` and run the following:

```console
$ pnpm start
```

If it all goes well, you should see logs similar to this.

```log
0/00/00, 0:00:00 AM:       ~      INFO  Starting pinboard!
...
0/00/00, 0:00:00 AM:       ~      INFO  Pinboard has logged in to Discord.
```
