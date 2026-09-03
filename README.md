# IINA Discord Presence

Discord Rich Presence for [IINA](https://iina.io/).

## Features

- Shows `Watching <video name>` for video files
- Shows `Listen to <audio name>` for audio files
- Adds the source URL as an RPC button for web media
- Updates on play, pause, seek, and media changes
- Clears the presence when playback ends

## Installation

### GitHub

In IINA, install the plugin from GitHub:

```text
playfairs/iina-discord-presence
```

### `.iinaplgz`

Download the latest `.iinaplgz` file from [Releases](https://github.com/playfairs/iina-discord-presence/releases) and open it with IINA.

## Development

```bash
git clone https://github.com/playfairs/iina-discord-presence
cd iina-discord-presence
nix develop -c just build
```

The plugin archive is written to `build/iina-discord-presence.iinaplgz`.

Nix provides the build tools, including `just`, Node.js, and `zip`. To enter the
development shell interactively, run:

```bash
nix develop
```
