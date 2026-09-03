const net = require("net");
const fs = require("fs");

const { console, mpv } = iina;

const CLIENT_ID = "1536964384885186570";
const SOCKET_NAMES = Array.from(
  { length: 10 },
  (_, index) => `discord-ipc-${index}`,
);
const AUDIO_EXTENSIONS = new Set([
  "aac",
  "flac",
  "m4a",
  "mp3",
  "ogg",
  "opus",
  "wav",
  "wma",
]);

let updateTimer = null;
let lastActivityKey = null;
let lastPosition = null;
let lastIdle = null;

function socketPaths() {
  const directories = [
    process.env.XDG_RUNTIME_DIR,
    process.env.TMPDIR,
    process.env.TMP,
    process.env.TEMP,
    "/tmp",
    "/var/tmp",
    "/private/tmp",
    "/private/var/tmp",
  ].filter(Boolean);

  const paths = directories.flatMap((directory) =>
    SOCKET_NAMES.map((name) => `${directory.replace(/\/$/, "")}/${name}`),
  );

  function addMacosTempDirectories(directory, depth) {
    if (depth === 0) return;
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch (_) {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const child = `${directory}/${entry.name}`;
      paths.push(...SOCKET_NAMES.map((name) => `${child}/${name}`));
      addMacosTempDirectories(child, depth - 1);
    }
  }

  addMacosTempDirectories("/var/folders", 3);
  return [...new Set(paths)];
}

function mediaName(mediaPath) {
  let value = String(mediaPath || "Unknown");
  try {
    value = decodeURIComponent(value);
  } catch (_) {
  }

  value = value.split(/[?#]/, 1)[0].split("/").pop() || "Unknown";
  value = value.replace(/\.[^.]+$/, "");
  value = value
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return value || "Unknown";
}

function isAudio(mediaPath) {
  const match = String(mediaPath || "")
    .split(/[?#]/, 1)[0]
    .match(/\.([^.\/]+)$/);
  return match ? AUDIO_EXTENSIONS.has(match[1].toLowerCase()) : false;
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function currentPlayback() {
  const mediaPath = mpv.get("path") || mpv.get("filename") || "";
  const duration = Number(mpv.get("duration")) || 0;
  const position = Number(mpv.get("time-pos")) || 0;
  const paused = Boolean(mpv.get("pause"));
  const idle = !mediaPath;
  const title = mediaName(mediaPath);
  const details = `${isAudio(mediaPath) ? "Listen to" : "Watching"} ${title}`;

  return {
    mediaPath: String(mediaPath),
    details,
    duration,
    position,
    paused,
    idle,
  };
}

function sendPacket(socket, opcode, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  const packet = Buffer.allocUnsafe(8 + body.length);
  packet.writeUInt32LE(opcode, 0);
  packet.writeUInt32LE(body.length, 4);
  body.copy(packet, 8);
  socket.write(packet);
}

function readPacket(socket, callback) {
  let buffer = Buffer.alloc(0);

  function onData(chunk) {
    buffer = Buffer.concat([buffer, chunk]);
    if (buffer.length < 8) return;

    const length = buffer.readUInt32LE(4);
    if (buffer.length < 8 + length) return;
    socket.removeListener("data", onData);
    callback(buffer.subarray(8, 8 + length));
  }

  socket.on("data", onData);
}

function findSocket() {
  const paths = socketPaths();
  return paths.find((path) => {
    try {
      return fs.statSync(path).isSocket();
    } catch (_) {
      return false;
    }
  });
}

function updateDiscord(activity) {
  const socketPath = findSocket();
  if (!socketPath) {
    console.log("Discord RPC unavailable: IPC socket not found");
    return;
  }

  const socket = net.createConnection({ path: socketPath });
  let finished = false;

  const close = () => {
    if (finished) return;
    finished = true;
    socket.destroy();
  };

  socket.once("error", (error) => {
    console.log(`Discord RPC unavailable: ${error.message}`);
    close();
  });

  socket.once("connect", () => {
    readPacket(socket, (handshake) => {
      let ready;
      try {
        ready = JSON.parse(handshake.toString("utf8"));
      } catch (_) {
        close();
        return;
      }
      if (ready.evt !== "READY") {
        close();
        return;
      }

      const nonce = `${Date.now()}-${Math.random()}`;
      readPacket(socket, () => close());
      sendPacket(socket, 1, {
        cmd: "SET_ACTIVITY",
        args: {
          pid: process.pid,
          activity,
        },
        nonce,
      });
    });
    sendPacket(socket, 0, { v: 1, client_id: CLIENT_ID });
  });
}

function buildActivity(playback) {
  if (playback.idle) return null;

  const activity = {
    type: 3,
    details: playback.details,
    state: playback.paused ? "Paused" : "Playing on IINA",
  };

  if (!playback.paused && playback.duration > 0) {
    const start = Math.floor(Date.now() / 1000 - playback.position);
    activity.timestamps = {
      start,
      end: start + Math.floor(playback.duration),
    };
  }

  if (isHttpUrl(playback.mediaPath)) {
    activity.buttons = [{ label: "Open source", url: playback.mediaPath }];
  }

  return activity;
}

function refreshPresence() {
  updateTimer = null;
  const playback = currentPlayback();
  const activity = buildActivity(playback);
  const activityKey = JSON.stringify({
    details: activity && activity.details,
    state: activity && activity.state,
    buttons: activity && activity.buttons,
  });
  const positionChanged =
    lastPosition === null || Math.abs(playback.position - lastPosition) >= 5;
  const playbackStateChanged = lastIdle !== playback.idle;
  if (
    activityKey === lastActivityKey &&
    !positionChanged &&
    !playbackStateChanged
  ) {
    return;
  }
  lastActivityKey = activityKey;
  lastPosition = playback.position;
  lastIdle = playback.idle;
  updateDiscord(activity);
}

function scheduleRefresh() {
  if (updateTimer) return;
  updateTimer = setTimeout(refreshPresence, 250);
}

for (const property of ["path", "filename", "duration", "time-pos", "pause"]) {
  mpv.observe(property, scheduleRefresh);
}

for (const event of ["file-loaded", "start-file", "end-file", "shutdown"]) {
  mpv.onEvent(event, scheduleRefresh);
}

console.log("iina-discord-presence loaded");
scheduleRefresh();
