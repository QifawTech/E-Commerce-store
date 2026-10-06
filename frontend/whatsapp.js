// WhatsApp socket for SmartStore (uses whatsapp-web.js: link your number by scanning a QR code)
// Install:  npm install ws qrcode whatsapp-web.js
// Use in server.js:
//   const http = require('http');
//   const server = http.createServer(app);
//   require('./whatsapp')(server);
//   server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const sessions = new Map(); // merchantId -> { client, sockets, state, qr, number }

const out = (ws, msg) => ws.readyState === 1 && ws.send(JSON.stringify(msg));
const broadcast = (s, msg) => s.sockets.forEach(ws => out(ws, msg));

function startClient(id) {
  const s = { sockets: new Set(), state: 'starting', qr: null, number: '', client: null };
  sessions.set(id, s);

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'merchant_' + id }),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
  });
  s.client = client;

  client.on('qr', async qr => {
    s.state = 'qr';
    s.qr = await QRCode.toDataURL(qr, { width: 300 });
    broadcast(s, { type: 'qr', qr: s.qr });
  });
  client.on('ready', () => {
    s.state = 'ready'; s.qr = null;
    s.number = (client.info && client.info.wid && client.info.wid.user) || '';
    console.log('WhatsApp ready for merchant', id, s.number);
    broadcast(s, { type: 'ready', number: s.number });
  });
  client.on('auth_failure', m => broadcast(s, { type: 'error', message: 'WhatsApp auth failed: ' + m }));
  client.on('disconnected', () => {
    broadcast(s, { type: 'status', state: 'disconnected' });
    sessions.delete(id);
    client.destroy().catch(() => {});
  });

  client.initialize().catch(err => {
    console.error('WhatsApp start error:', err.message);
    broadcast(s, { type: 'error', message: 'WhatsApp failed to start: ' + err.message });
    sessions.delete(id);
  });
  return s;
}

module.exports = function attachWhatsApp(server) {
  const wss = new WebSocketServer({ server, path: '/wa' });

  wss.on('connection', ws => {
    let session = null;

    ws.on('message', async raw => {
      let m; try { m = JSON.parse(raw); } catch (e) { return; }

      if (m.type === 'auth') {
        let id;
        try { id = String(jwt.verify(m.token, process.env.JWT_SECRET).id); }
        catch (e) { out(ws, { type: 'error', message: 'Invalid login token. Please login again.' }); return ws.close(); }
        session = sessions.get(id) || startClient(id);
        session.sockets.add(ws);
        if (session.state === 'ready') out(ws, { type: 'ready', number: session.number });
        else if (session.qr) out(ws, { type: 'qr', qr: session.qr });
        else out(ws, { type: 'status', state: 'starting' });
        return;
      }

      if (!session) return out(ws, { type: 'error', message: 'Not authenticated' });

      if (m.type === 'send') {
        if (session.state !== 'ready') return out(ws, { type: 'error', message: 'WhatsApp is not connected yet' });
        try {
          const numberId = await session.client.getNumberId(String(m.to).replace(/\D/g, ''));
          if (!numberId) return out(ws, { type: 'error', message: 'This number is not on WhatsApp' });
          await session.client.sendMessage(numberId._serialized, String(m.message));
          out(ws, { type: 'sent', ok: true });
        } catch (e) { out(ws, { type: 'error', message: 'Send failed: ' + e.message }); }
      }

      if (m.type === 'logout') {
        try { await session.client.logout(); } catch (e) {}
      }
    });

    ws.on('close', () => { if (session) session.sockets.delete(ws); });
  });

  console.log('WhatsApp socket ready at /wa');
};