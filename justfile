default: build

check:
    node --check src/index.js

build: check
    rm -rf build
    mkdir -p build
    zip -r -q build/iina-discord-presence.iinaplgz Info.json src -x '*.DS_Store'