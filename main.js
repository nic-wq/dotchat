const { app, BrowserWindow, ipcMain } = require('electron');
const os = require('os');
const path = require('path');
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

let mainWindow = null;
let httpServer = null;
let webSocketServer = null;
let currentPort = 3000;

function getNetworkAddresses() {
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(nets)) {
    for (const info of nets[name] || []) {
      if (info.family === 'IPv4' && !info.internal) {
        addresses.push(info.address);
      }
    }
  }
  return addresses;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    title: 'dotchat',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  await mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

async function startServer(port) {
  if (httpServer || webSocketServer) {
    await stopServer();
  }

  const appExpress = express();

  appExpress.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  const server = http.createServer(appExpress);

  const wss = new WebSocketServer({ server, path: '/ws' });

  function broadcastString(text) {
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        try { client.send(text); } catch (_) {}
      }
    }
  }

  function sendSystem(event, name) {
    const payload = JSON.stringify({ type: 'system', event, name });
    broadcastString(payload);
  }

  wss.on('connection', (ws) => {
    ws._dotchatName = null;

    ws.on('message', (data, isBinary) => {
      let asText;
      try {
        asText = isBinary ? data.toString('utf8') : (typeof data === 'string' ? data : String(data));
      } catch (_) {
        asText = String(data);
      }

      try {
        const parsed = JSON.parse(asText);
        if (parsed && typeof parsed === 'object') {
          if (parsed.type === 'presence:join') {
            ws._dotchatName = (parsed.name && String(parsed.name)) || 'Anônimo';
            sendSystem('join', ws._dotchatName);
            return;
          }
          if (parsed.type === 'message' || parsed.type === 'message:e2e' || parsed.type === 'crypto:pubkey') {
            broadcastString(JSON.stringify(parsed));
            return;
          }
        }
      } catch (_) {}

      broadcastString(asText);
    });

    ws.on('close', () => {
      if (ws._dotchatName) {
        sendSystem('leave', ws._dotchatName);
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.listen(port, () => resolve());
    server.on('error', reject);
  });

  httpServer = server;
  webSocketServer = wss;
  currentPort = port;
}

async function stopServer() {
  const closeWss = async () => {
    if (webSocketServer) {
      try {
        for (const client of webSocketServer.clients) {
          try { client.terminate(); } catch (_) {}
        }
        await new Promise((resolve) => webSocketServer.close(() => resolve()));
      } catch (_) {}
      webSocketServer = null;
    }
  };

  const closeHttp = async () => {
    if (httpServer) {
      try {
        await new Promise((resolve) => httpServer.close(() => resolve()));
      } catch (_) {}
      httpServer = null;
    }
  };

  await Promise.all([closeWss(), closeHttp()]);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async (e) => {
  e.preventDefault();
  try {
    await stopServer();
  } finally {
    app.exit(0);
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

ipcMain.handle('serve:start', async (_event, args) => {
  const port = (args && args.port) || 3000;
  try {
    await startServer(port);
    const hostnames = [os.hostname()];
    const lan = getNetworkAddresses();
    return {
      ok: true,
      port,
      endpoints: {
        hostname: hostnames.map((h) => `ws://${h}:${port}/ws`),
        lan: lan.map((ip) => `ws://${ip}:${port}/ws`),
        localhost: [`ws://localhost:${port}/ws`]
      }
    };
  } catch (error) {
    await stopServer();
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
});

ipcMain.handle('serve:stop', async () => {
  try {
    await stopServer();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
}); 