# IINA Discord Presence

A Discord Rich Presence plugin for [IINA](https://iina.io/).

## Status

The plugin currently verifies that it loads in IINA and shows a startup notification. Discord RPC requires a small helper process because IINA JavaScript plugins cannot access Discord's local IPC socket directly.

## Installation

### From GitHub

After committing and pushing this directory, install `playfairs/iina-discord-presence` from IINA's plugin installer.

### From an archive

```bash
npm run package
```

Open the generated `iina-discord-presence.iinaplgz` file with IINA.

## Development

```bash
npm run check
npm run package
```