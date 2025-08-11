/* UI Elements */
const homeSection = document.getElementById('home-section');
const serveSection = document.getElementById('serve-section');
const joinSection = document.getElementById('join-section');
const chatScreen = document.getElementById('chat-screen');

const btnServe = document.getElementById('btn-serve');
const btnJoin = document.getElementById('btn-join');

const btnBackServe = document.getElementById('btn-back-serve');
const btnBackJoin = document.getElementById('btn-back-join');

const servePortInput = document.getElementById('serve-port');
const serveNameInput = document.getElementById('serve-name');
const serveStatus = document.getElementById('serve-status');
const btnStartServe = document.getElementById('btn-start-serve');
const btnStopServe = document.getElementById('btn-stop-serve');
const connectionBarServe = document.getElementById('connection-bar-serve');
const endpointsList = document.getElementById('endpoints-list');
const btnOpenChat = document.getElementById('btn-open-chat');
const btnCloseServer = document.getElementById('btn-close-server');

const joinUrlInput = document.getElementById('join-url');
const joinNameInput = document.getElementById('join-name');
const btnConnect = document.getElementById('btn-connect');

const messagesEl = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const btnSend = document.getElementById('btn-send');
const btnDisconnectTop = document.getElementById('btn-disconnect-top');
const debugToggle = document.getElementById('debug-toggle');
let debugMode = false;
if (debugToggle) debugToggle.addEventListener('change', () => { debugMode = !!debugToggle.checked; });

const toastsEl = document.getElementById('toasts');
function toast(message, type = 'success', timeoutMs = 1800) {
  if (!toastsEl) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  toastsEl.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, timeoutMs);
}

/* State */
let ws = null;
let displayName = '';
let connectedUrl = '';

/* E2E State */
let peerPublicKeyB64 = null;
let myPublicKeyB64 = null;

function ensureMyPublicKey() {
  if (!myPublicKeyB64 && window.dotchatCrypto) {
    try { myPublicKeyB64 = window.dotchatCrypto.getPublicKey(); } catch (_) {}
  }
  return myPublicKeyB64;
}

/* Navigation */
function show(section) {
  for (const el of [homeSection, serveSection, joinSection, chatScreen]) {
    if (el) el.classList.add('hidden');
  }
  section.classList.remove('hidden');
}

btnServe.addEventListener('click', () => show(serveSection));
btnJoin.addEventListener('click', () => show(joinSection));
btnBackServe.addEventListener('click', () => show(homeSection));
btnBackJoin.addEventListener('click', () => show(homeSection));

/* Serve Flow */
btnStartServe.addEventListener('click', async () => {
  const port = Number(servePortInput.value) || 3000;
  displayName = (serveNameInput.value || '').trim();
  setServeUiBusy(true);
  btnStartServe.classList.add('loading');
  serveStatus.textContent = 'Iniciando servidor...';
  connectionBarServe.classList.add('hidden');
  if (endpointsList) endpointsList.innerHTML = '';
  try {
    const res = await window.dotchat.serveStart({ port });
    if (res && res.ok) {
      serveStatus.textContent = 'Servidor em execução.';
      renderEndpoints(res.endpoints);
      connectionBarServe.classList.remove('hidden');
      btnStopServe.disabled = false;
      toast('Servidor iniciado', 'success');
    } else {
      throw new Error(res && res.error ? res.error : 'Falha ao iniciar');
    }
  } catch (err) {
    serveStatus.textContent = `Erro: ${err.message || err}`;
    toast(`Erro ao iniciar: ${err.message || err}`, 'error', 2800);
  } finally {
    setServeUiBusy(false);
    btnStartServe.classList.remove('loading');
  }
});

btnStopServe.addEventListener('click', async () => {
  setServeUiBusy(true);
  btnStopServe.classList.add('loading');
  serveStatus.textContent = 'Parando...';
  try {
    await window.dotchat.serveStop();
    serveStatus.textContent = 'Parado.';
    btnStopServe.disabled = true;
    connectionBarServe.classList.add('hidden');
    if (endpointsList) endpointsList.innerHTML = '';
    toast('Servidor parado', 'success');
  } catch (err) {
    serveStatus.textContent = `Erro: ${err.message || err}`;
    toast(`Falha ao parar: ${err.message || err}`, 'error', 2800);
  } finally {
    setServeUiBusy(false);
    btnStopServe.classList.remove('loading');
  }
});

btnOpenChat.addEventListener('click', () => {
  const first = endpointsList?.querySelector('.endpoint')?.textContent?.trim();
  const wsUrl = first || '';
  if (!wsUrl) { toast('Nenhum endpoint disponível', 'error'); return; }
  connectWs(wsUrl);
});

btnCloseServer.addEventListener('click', async () => {
  btnCloseServer.disabled = true;
  serveStatus.textContent = 'Encerrando servidor...';
  try {
    await window.dotchat.serveStop();
    serveStatus.textContent = 'Servidor encerrado';
    btnStopServe.disabled = true;
    connectionBarServe.classList.add('hidden');
    if (endpointsList) endpointsList.innerHTML = '';
  } catch (err) {
    serveStatus.textContent = `Erro: ${err.message || err}`;
  } finally {
    btnCloseServer.disabled = false;
  }
});

function setServeUiBusy(busy) {
  btnStartServe.disabled = busy;
  servePortInput.disabled = busy;
}

/* Join Flow */
btnConnect.addEventListener('click', () => {
  const base = (joinUrlInput.value || '').trim();
  if (!base) { toast('Informe o endpoint ws://host:porta/ws', 'error'); return; }
  connectFromJoin();
});
joinUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') connectFromJoin();
});

function connectFromJoin() {
  displayName = (joinNameInput.value || '').trim();
  const base = (joinUrlInput.value || '').trim();
  if (!base) return;
  const wsUrl = buildWsUrl(base);
  connectWs(wsUrl);
}

function buildWsUrl(input) {
  try {
    let url = input.trim();
    if (!(url.startsWith('ws://') || url.startsWith('wss://'))) {
      url = 'ws://' + url;
    }
    const u = new URL(url);
    if (!u.pathname || u.pathname === '/') {
      u.pathname = '/ws';
    }
    return u.toString();
  } catch (_) {
    return input; // fallback
  }
}

function sendPresence(ws) {
  try {
    ws.send(JSON.stringify({ type: 'presence:join', name: displayName || 'Anônimo' }));
    ensureMyPublicKey();
    ws.send(JSON.stringify({ type: 'crypto:pubkey', pub: myPublicKeyB64 }));
  } catch (_) {}
}

function tryEncryptOutgoing(text) {
  if (!peerPublicKeyB64) {
    if (debugMode) console.log('[dotchat:debug] E2E inativo: enviando plaintext');
    return { type: 'message', text, name: displayName || 'Anônimo', from: ensureMyPublicKey() };
  }
  const sealed = window.dotchatCrypto.encryptFor(peerPublicKeyB64, text);
  if (debugMode) {
    console.log('[dotchat:debug] outgoing:e2e', { from: ensureMyPublicKey(), to: peerPublicKeyB64, payload: sealed });
  }
  return { type: 'message:e2e', name: displayName || 'Anônimo', from: ensureMyPublicKey(), payload: sealed };
}

function tryDecryptIncoming(data) {
  if (data.type === 'crypto:pubkey' && data.pub) {
    ensureMyPublicKey();
    const incoming = String(data.pub);
    if (incoming === myPublicKeyB64) {
      if (debugMode) console.log('[dotchat:debug] ignorando própria chave pública');
      return null;
    }
    if (!peerPublicKeyB64) {
      peerPublicKeyB64 = incoming;
      if (debugMode) console.log('[dotchat:debug] peer pubkey definida', peerPublicKeyB64);
      appendSystem('Chave pública recebida. E2E ativo.');
    }
    return null;
  }
  if (data.type === 'message:e2e' && data.payload && data.from) {
    try {
      const text = window.dotchatCrypto.decryptFrom(String(data.from), data.payload);
      return { name: data.name || 'Anônimo', text };
    } catch (e) {
      if (debugMode) console.warn('[dotchat:debug] falha ao decifrar', e);
      appendSystem('Falha ao decifrar uma mensagem.');
      return null;
    }
  }
  if (data.type === 'message') {
    return { name: data.name || 'Anônimo', text: data.text };
  }
  return null;
}

function connectWs(url) {
  cleanupWs();
  try {
    ws = new WebSocket(url);
  } catch (err) {
    alert(`Erro ao criar WebSocket: ${err.message || err}`);
    return;
  }

  connectedUrl = url;
  show(chatScreen);
  toast('Conectando...', 'success', 1000);

  ws.addEventListener('open', () => {
    appendSystem('Conectado. Enviando presença e chave pública...');
    sendPresence(ws);
  });
  ws.addEventListener('close', () => {
    appendSystem('Conexão encerrada.');
    toast('Desconectado', 'error');
  });
  ws.addEventListener('error', () => {
    appendSystem('Erro de conexão.');
    toast('Erro de conexão', 'error');
  });
  ws.addEventListener('message', (event) => {
    const text = ensureText(event.data);
    try {
      const data = JSON.parse(text);
      if (data && typeof data === 'object') {
        if (data.type === 'system' && data.event) {
          const who = data.name ? String(data.name) : 'Alguém';
          if (data.event === 'join') appendSystem(`${who} se conectou ao chat`);
          if (data.event === 'leave') appendSystem(`${who} saiu do chat`);
          return;
        }
        if (data.type === 'message:e2e' && debugMode) {
          console.log('[dotchat:debug] incoming:e2e envelope', { from: data.from, payload: data.payload });
        }
        ensureMyPublicKey();
        if (data.type === 'message:e2e' && data.from === myPublicKeyB64) {
          if (debugMode) console.log('[dotchat:debug] ignorando eco da própria mensagem e2e');
          return;
        }
        if (data.type === 'message' && data.from && data.from === myPublicKeyB64) {
          if (debugMode) console.log('[dotchat:debug] ignorando eco da própria mensagem (plaintext)');
          return;
        }
        const maybe = tryDecryptIncoming(data);
        if (maybe) {
          appendMessageRich(String(maybe.name || 'Anônimo'), String(maybe.text || ''));
        }
        return;
      }
    } catch (_) {}
    appendMessage(String(text));
  });
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
  const payload = tryEncryptOutgoing(text);
  try { ws.send(JSON.stringify(payload)); } catch (_) {}
  // Mostrar imediatamente apenas se E2E estiver ativo (para evitar duplicação com eco plaintext)
  if (peerPublicKeyB64) {
    appendMessageRich(String(displayName || 'Anônimo'), text);
  }
  messageInput.value = '';
}

btnDisconnectTop.addEventListener('click', () => {
  cleanupWs();
  show(homeSection);
});

function ensureText(payload) {
  if (typeof payload === 'string') return payload;
  try {
    if (payload instanceof Blob) {
      return '[blob]';
    }
  } catch (_) {}
  try {
    if (payload && payload.byteLength !== undefined) {
      return new TextDecoder('utf-8').decode(payload);
    }
  } catch (_) {}
  try { return String(payload); } catch (_) { return '[unknown]'; }
}

function cleanupWs() {
  if (ws) {
    try { ws.close(); } catch (_) {}
    ws = null;
  }
}

btnSend.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function appendMessage(text) {
  const li = document.createElement('li');
  li.textContent = text;
  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendMessageRich(name, text) {
  const li = document.createElement('li');
  const nameEl = document.createElement('span');
  nameEl.className = 'name';
  nameEl.textContent = name + ':';
  const textEl = document.createElement('span');
  textEl.textContent = ' ' + text;
  li.appendChild(nameEl);
  li.appendChild(textEl);
  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendSystem(text) {
  const li = document.createElement('li');
  li.className = 'system';
  li.textContent = text;
  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderEndpoints(endpoints) {
  if (!endpointsList) return;
  const items = [];
  if (endpoints?.localhost) items.push(...endpoints.localhost);
  if (endpoints?.lan) items.push(...endpoints.lan);
  if (endpoints?.hostname) items.push(...endpoints.hostname);
  endpointsList.innerHTML = '';
  for (const ep of items) {
    const div = document.createElement('div');
    div.className = 'endpoint';
    div.textContent = ep;
    endpointsList.appendChild(div);
  }
} 