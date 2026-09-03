# IINA Discord Presence

A better version of **[IINAcord](https://github.com/playfairs/iinacord)**.

Discord Rich Presence for [IINA](https://iina.io/).

## Features

* Shows what you're watching
* Displays playback progress
* Updates when you play, pause, seek, or change media
* Clears your presence when nothing is playing

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