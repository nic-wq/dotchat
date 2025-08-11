const { contextBridge, ipcRenderer } = require('electron');

// Crypto (NaCl) for E2E exposed safely to the renderer
let dotchatCrypto = null;
try {
  const nacl = require('tweetnacl');
  const util = require('tweetnacl-util');

  const appKeyPair = nacl.box.keyPair();
  const toBase64 = (u8) => util.encodeBase64(u8);
  const fromBase64 = (b64) => util.decodeBase64(b64);
  const encodeUTF8 = (str) => util.decodeUTF8(str);
  const decodeUTF8 = (u8) => util.encodeUTF8(u8);
  const makeNonce = () => nacl.randomBytes(nacl.box.nonceLength);

  const getPublicKey = () => toBase64(appKeyPair.publicKey);
  const encryptFor = (recipientPubKeyBase64, plaintext) => {
    const recipientPub = fromBase64(recipientPubKeyBase64);
    const nonce = makeNonce();
    const msgU8 = encodeUTF8(plaintext);
    const box = nacl.box(msgU8, nonce, recipientPub, appKeyPair.secretKey);
    return { nonce: toBase64(nonce), cipher: toBase64(box) };
  };
  const decryptFrom = (senderPubKeyBase64, payload) => {
    const senderPub = fromBase64(senderPubKeyBase64);
    const nonce = fromBase64(payload.nonce);
    const cipher = fromBase64(payload.cipher);
    const opened = nacl.box.open(cipher, nonce, senderPub, appKeyPair.secretKey);
    if (!opened) throw new Error('Failed to decrypt');
    return decodeUTF8(opened);
  };

  dotchatCrypto = { getPublicKey, encryptFor, decryptFrom };
} catch (_) {
  dotchatCrypto = null;
}

contextBridge.exposeInMainWorld('dotchat', {
  serveStart: async (options) => {
    const payload = options && typeof options === 'object' ? options : {};
    return ipcRenderer.invoke('serve:start', payload);
  },
  serveStop: async () => {
    return ipcRenderer.invoke('serve:stop');
  }
});

if (dotchatCrypto) {
  contextBridge.exposeInMainWorld('dotchatCrypto', dotchatCrypto);
} 