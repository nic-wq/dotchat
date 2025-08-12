// ws-server.js
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3000 });
let clients = [];

wss.on("connection", (ws) => {
  console.log("Novo cliente conectado.");
  clients.push(ws);

  if (clients.length > 2) {
    ws.send(JSON.stringify({ error: "Máximo de 2 clientes." }));
    ws.close();
    return;
  }

  ws.on("message", (msg) => {
    const target = clients.find(c => c !== ws && c.readyState === WebSocket.OPEN);
    if (target) target.send(msg);
  });

  ws.on("close", () => {
    console.log("Cliente desconectado.");
    clients = clients.filter(c => c !== ws);
  });
});
