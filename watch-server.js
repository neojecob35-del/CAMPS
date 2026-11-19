'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const serverFile = path.join(root, 'server.js');
const PORT = Number(process.env.PORT || 4173);
let child = null;
let watcher = null;
let restartTimer = null;
let restartPending = false;
let stopping = false;

async function serverAlreadyRunning() {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function scheduleCrashRestart() {
  if (stopping) return;
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    if (!stopping) startServer();
  }, 2000);
}

function startServer() {
  if (stopping) return;
  const processHandle = spawn(process.execPath, [serverFile], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  child = processHandle;
  processHandle.once('error', (error) => {
    if (child !== processHandle) return;
    child = null;
    console.error('Could not start campaign server:', error.message);
    scheduleCrashRestart();
  });
  processHandle.once('exit', (code, signal) => {
    if (child !== processHandle) return;
    child = null;
    if (stopping) return;
    if (restartPending) {
      restartPending = false;
      console.log('Restarting campaign server after server.js changed…');
      startServer();
      return;
    }
    console.error(`Campaign server exited${signal ? ` on ${signal}` : ` with code ${code}`}. Restarting in 2s…`);
    scheduleCrashRestart();
  });
}

function scheduleRestart() {
  if (stopping) return;
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    if (!child) {
      startServer();
      return;
    }
    restartPending = true;
    child.kill();
  }, 200);
}

try {
  watcher = fs.watch(root, { persistent: true }, (eventType, filename) => {
    if (filename && String(filename) !== path.basename(serverFile)) return;
    if (eventType === 'change' || eventType === 'rename') scheduleRestart();
  });
  watcher.on('error', (error) => console.error('Server file watcher error:', error.message));
} catch (error) {
  console.error('Could not watch server.js:', error.message);
  process.exit(1);
}

function stop() {
  if (stopping) return;
  stopping = true;
  clearTimeout(restartTimer);
  if (watcher) watcher.close();
  if (child) child.kill();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

console.log('Watching server.js for changes.');

(async () => {
  if (await serverAlreadyRunning()) {
    console.log('Campaign server is already running; watcher exiting.');
    if (watcher) watcher.close();
    process.exit(0);
  }
  startServer();
})();
