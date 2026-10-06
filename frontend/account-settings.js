/* Settings + Account section for dashboard.html
   Load AFTER the main dashboard <script> (needs $, toast, mySlug, getMe, loadAccount, saveAccount, switchTab). */
(function () {
  const q = id => document.getElementById(id);
  const KEY = 'smartstore_settings';
  const storeKey = () => mySlug() || '_';
  const readAll = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const get = part => (readAll()[storeKey()] || {})[part] || {};
  const put = (part, data) => { const all = readAll(); all[storeKey()] = Object.assign({}, all[storeKey()], { [part]: data }); localStorage.setItem(KEY, JSON.stringify(all)); };
  const v = id => q(id).value.trim();
  const setv = (id, val) => { if (q(id)) q(id).value = val == null ? '' : val; };

  /* ---------- html helpers ---------- */
  const field = (id, label, o = {}) => `<div class="${o.col || 'col-md-6'}"><label class="field-label">${label}</label>` +
    (o.secret
      ? `<div class="eye-wrap"><input id="${id}" type="password" class="field" placeholder="${o.ph || ''}"><button type="button" onclick="var i=document.getElementById('${id}');i.type=i.type==='password'?'text':'password'"><i class="bi bi-eye"></i></button></div>`
      : `<input id="${id}" type="${o.type || 'text'}" class="field" placeholder="${o.ph || ''}" ${o.ro ? 'readonly' : ''} value="${o.val || ''}">`) +
    (o.hint ? `<small class="text-secondary" style="font-size:.72rem">${o.hint}</small>` : '') + `</div>`;
  const sw = (id, title, sub) => `<div class="d-flex justify-content-between align-items-center py-3"><div><div class="fw-semibold" style="font-size:.9rem">${title}</div><div class="small text-secondary" style="font-size:.75rem">${sub}</div></div><label class="switch"><input type="checkbox" id="${id}"><span class="slider"></span></label></div>`;
  const saveBtn = fn => `<div class="text-end mt-4"><button class="btn-orange" onclick="${fn}">Save Changes</button></div>`;
  const title = (icon, t) => `<h5 class="fw-bold mb-3"><i class="bi ${icon} me-2"></i>${t}</h5>`;

  /* ---------- Settings page ---------- */
  q('view-settings').innerHTML = `
    <div class="mb-4"><h2 class="fw-bold fs-4 mb-1">Settings</h2><p class="text-secondary small mb-0">Manage your store, payments, printer and integrations.</p></div>
    <div class="row g-3">
      <div class="col-md-6 col-lg-4"><div class="set-card" onclick="openAccount('profile')" style="--g:linear-gradient(135deg,#6a7cf7,#4a6cf7)">
        <div class="set-ic"><i class="bi bi-person-gear"></i></div>
        <div><div class="fw-bold">Account</div><div class="small text-secondary">Profile, payments, subscription and printer</div></div>
        <i class="bi bi-chevron-right ms-auto text-secondary"></i></div></div>
      <div class="col-md-6 col-lg-4"><div class="set-card" onclick="openAccount('whatsapp')" style="--g:linear-gradient(135deg,#34d399,#059669)">
        <div class="set-ic"><i class="bi bi-whatsapp"></i></div>
        <div><div class="fw-bold">WhatsApp Socket</div><div class="small text-secondary">Connect WhatsApp to send bills and order updates</div></div>
        <i class="bi bi-chevron-right ms-auto text-secondary"></i></div></div>
    </div>`;

  /* ---------- Account page ---------- */
  const tabs = [['profile', 'bi-person', 'Profile'], ['payment', 'bi-credit-card', 'Payment Provider'],
    ['subscription', 'bi-gem', 'Subscription'], ['printer', 'bi-printer', 'Printer'], ['whatsapp', 'bi-whatsapp', 'WhatsApp Socket']];

  const profile = `<div id="ap-profile" class="acc-panel card-box">${title('bi-shop', 'Store Information')}
    <div class="d-flex justify-content-between align-items-start mb-4">
      <div><div class="fw-bold" id="accTitle">Store</div><a id="accUrl" href="#" target="_blank" class="small text-secondary text-decoration-none">-</a></div>
      <div class="text-center"><div class="small fw-bold mb-1">QR Code</div><div id="qrBox" style="padding:6px;border:1px solid #e2e8f0;border-radius:8px;background:#fff"></div></div>
    </div>
    <div class="row g-3">${field('accBrand', 'Store Name')}${field('accEmail', 'Email Address', { ro: 1, hint: 'Email cannot be changed' })}
      ${field('accPhone', 'Phone')}${field('accCategory', 'Store Type', { ro: 1 })}${field('accGstin', 'GSTIN', { ph: 'Enter GSTIN' })}
      <div class="col-12"><label class="field-label">Address</label><textarea id="accAddress" class="field" rows="2"></textarea></div></div>
    ${saveBtn('saveAccount()')}</div>`;

  const payment = `<div id="ap-payment" class="acc-panel card-box d-none">${title('bi-credit-card', 'Payment Configuration')}
    <div class="row g-3">${field('pGateway', 'Payment Gateway', { ro: 1, val: 'PhonePe' })}
      <div class="col-md-6"><label class="field-label">Environment</label><select id="pEnv" class="field"><option value="sandbox">Sandbox</option><option value="production">Production</option></select></div>
      ${field('pClientId', 'Client ID', { ph: 'Enter PhonePe Client ID' })}${field('pSecret', 'Client Secret', { secret: 1, ph: 'Enter PhonePe Client Secret' })}
      ${field('pVersion', 'Client Version', { val: '1' })}${field('pCbUser', 'Callback Username', { ph: 'Enter Callback Username' })}
      ${field('pCbPass', 'Callback Password', { secret: 1, ph: 'Enter Callback Password' })}</div>
    ${saveBtn('SA.savePayment()')}</div>`;

  const subscription = `<div id="ap-subscription" class="acc-panel card-box d-none">${title('bi-gem', 'Subscription')}
    <div class="row g-3">${field('sPlan', 'Plan', { ro: 1 })}${field('sCycle', 'Billing Cycle', { ro: 1 })}
      <div class="col-md-6"><label class="field-label">Status</label><div><span id="sStatus" class="badge rounded-pill" style="background:#dcfce7;color:#166534;padding:6px 14px">Trial</span></div></div>
      ${field('sExp', 'Expires On', { ro: 1 })}</div></div>`;

  const printer = `<div id="ap-printer" class="acc-panel card-box d-none">${title('bi-printer', 'Thermal Printer')}
    <label class="field-label">Connection Mode</label>
    <div class="row g-2 mb-3">
      <div class="col-md-4"><div class="mode-card" data-m="bluetooth" onclick="SA.setMode('bluetooth')">Bluetooth<small>Auto-print via Bluetooth (recommended)</small></div></div>
      <div class="col-md-4"><div class="mode-card" data-m="usb" onclick="SA.setMode('usb')">USB (Serial)<small>Auto-print via COM port</small></div></div>
      <div class="col-md-4"><div class="mode-card" data-m="browser" onclick="SA.setMode('browser')">Browser Print<small>Any printer (shows print dialog)</small></div></div>
    </div>
    <div class="info-box mb-3"><div><div class="fw-semibold" id="prName" style="font-size:.9rem"></div><div class="small text-secondary" id="prSub" style="font-size:.75rem"></div></div>
      <button class="btn-orange" id="prConnect" onclick="SA.connectPrinter()"><i class="bi bi-printer me-1"></i> Connect Printer</button></div>
    <label class="field-label">Paper Width</label>
    <div class="row g-2 mb-3">
      <div class="col-6"><div class="mode-card center" data-w="80" onclick="SA.setWidth('80')">80mm<small>Standard (48 chars)</small></div></div>
      <div class="col-6"><div class="mode-card center" data-w="58" onclick="SA.setWidth('58')">58mm<small>Compact (32 chars)</small></div></div>
    </div>
    <div class="opt-box mb-3">${sw('prCaptain', 'Captain Printing', 'ON = captain pairs printer on his device and prints direct. OFF = single counter printer via admin.')}
      ${sw('prAsk', 'Ask before print', 'ON = show "Do you want to print the bill" Yes/No. OFF = print automatic.')}
      <div class="text-end pb-2"><button class="btn-orange" onclick="SA.savePrinter()">Save Printer Options</button></div></div>
    <div class="text-end"><button class="btn-outline-soft" id="prTest" onclick="SA.printTest()"><i class="bi bi-printer me-1"></i> Print Test Receipt</button></div></div>`;

  const whatsapp = `<div id="ap-whatsapp" class="acc-panel card-box d-none">
    <div class="d-flex justify-content-between align-items-center mb-1">${title('bi-whatsapp', 'WhatsApp Socket').replace('mb-3', 'mb-0')}<span class="wa-pill off" id="waPill">Disconnected</span></div>
    <p class="text-secondary small mb-3" id="waInfo">Not connected. Click Connect, then scan the QR code with WhatsApp.</p>
    <div id="waQrBox" class="text-center my-3 d-none"><img id="waQr" alt="WhatsApp QR" style="width:240px;height:240px;border:1px solid #e5e7eb;border-radius:12px;padding:8px;background:#fff">
      <div class="small text-secondary mt-2">WhatsApp &rarr; Settings &rarr; Linked devices &rarr; Link a device</div></div>
    <div class="row g-3">${field('wPhone', 'WhatsApp Number (for test message)', { ph: '919876543210', hint: 'With country code, no + sign' })}${field('wUrl', 'Socket Server URL', { ph: 'ws://localhost:5000/wa' })}</div>
    <div class="mt-2">${sw('wOrder', 'Send order confirmation', 'Message the customer when an order is placed')}${sw('wBill', 'Send bill after POS sale', 'Share the bill on WhatsApp when a sale is completed')}</div>
    <div class="d-flex gap-2 flex-wrap justify-content-end mt-2">
      <button class="btn-outline-soft" onclick="SA.waTest()"><i class="bi bi-send me-1"></i> Send Test Message</button>
      <button class="btn-outline-soft" onclick="SA.waUnlink()">Unlink WhatsApp</button>
      <button class="btn-outline-soft" onclick="SA.waDisconnect()">Disconnect</button>
      <button class="btn-outline-soft" onclick="SA.waConnect()"><i class="bi bi-plug me-1"></i> Connect</button>
      <button class="btn-orange" onclick="SA.waSave()">Save Changes</button></div></div>`;

  q('view-account').innerHTML = `
    <div class="acc-head"><div class="crumb-back" onclick="switchTab('settings', document.querySelector('[data-tab=settings]'))"><i class="bi bi-arrow-left"></i></div>
      <span id="crumbStore" class="fw-semibold">Store</span><i class="bi bi-chevron-right small text-secondary"></i><span>Account</span></div>
    <h3 class="fw-bold mb-1">Account</h3><p class="text-secondary small mb-3">Manage your store profile and settings</p>
    <div class="acc-tabs" id="accTabs">${tabs.map(t => `<div class="acc-tab" data-t="${t[0]}" onclick="accTab('${t[0]}')"><i class="bi ${t[1]}"></i>${t[2]}</div>`).join('')}</div>
    ${profile}${payment}${subscription}${printer}${whatsapp}`;

  /* ---------- navigation (overrides the old ones) ---------- */
  window.openAccount = function (tab) {
    document.querySelectorAll('.view').forEach(x => x.classList.add('d-none'));
    q('view-account').classList.remove('d-none');
    document.querySelectorAll('#sideNav .sidebar-link').forEach(l => l.classList.toggle('active', l.dataset.tab === 'settings'));
    q('crumbStore').textContent = getMe().brandName || 'Store';
    loadAccount(); loadAll(); window.accTab(tab || 'profile');
  };
  window.accTab = function (name) {
    document.querySelectorAll('#accTabs .acc-tab').forEach(t => t.classList.toggle('active', t.dataset.t === name));
    document.querySelectorAll('.acc-panel').forEach(p => p.classList.toggle('d-none', p.id !== 'ap-' + name));
  };

  /* ---------- state ---------- */
  const pr = { mode: 'bluetooth', width: '80', dev: null, name: '' };
  let ws = null, waReady = false;

  function loadAll() {
    const p = get('payment'); setv('pEnv', p.env || 'sandbox'); setv('pClientId', p.clientId); setv('pSecret', p.secret); setv('pVersion', p.version || '1'); setv('pCbUser', p.cbUser); setv('pCbPass', p.cbPass);
    let s = get('sub');
    if (!s.expires) { const d = new Date(); d.setDate(d.getDate() + 30); s = { plan: 'Basic', cycle: 'Monthly', status: 'Trial', expires: d.toISOString() }; put('sub', s); }
    setv('sPlan', s.plan); setv('sCycle', s.cycle); q('sStatus').textContent = s.status; setv('sExp', new Date(s.expires).toLocaleDateString());
    const pc = get('printer'); pr.mode = pc.mode || 'bluetooth'; pr.width = pc.width || '80'; q('prCaptain').checked = !!pc.captain; q('prAsk').checked = !!pc.ask; printerUI();
    const w = get('whatsapp'); setv('wPhone', w.phone); setv('wUrl', w.url || 'ws://localhost:5000/wa'); q('wOrder').checked = !!w.order; q('wBill').checked = !!w.bill;
  }

  function printerUI() {
    document.querySelectorAll('#ap-printer [data-m]').forEach(c => c.classList.toggle('on', c.dataset.m === pr.mode));
    document.querySelectorAll('#ap-printer [data-w]').forEach(c => c.classList.toggle('on', c.dataset.w === pr.width));
    const browser = pr.mode === 'browser', label = pr.mode === 'bluetooth' ? 'Bluetooth' : 'USB';
    q('prName').textContent = browser ? 'Browser Print selected' : pr.dev ? pr.name + ' connected' : 'No ' + label + ' Printer Connected';
    q('prSub').textContent = browser ? 'Any printer (shows print dialog).' : pr.dev ? 'Ready to print.' :
      (pr.mode === 'bluetooth' ? 'Make sure the printer is powered on with Bluetooth enabled.' : 'Connect the printer with a USB cable and allow access.');
    q('prConnect').style.display = browser ? 'none' : '';
    q('prTest').disabled = !(browser || pr.dev);
  }

  function waStatus(state) {
    const el = q('waPill');
    el.className = 'wa-pill ' + (state === 'connected' ? 'on' : (state === 'connecting' || state === 'qr') ? 'mid' : 'off');
    el.textContent = { connected: 'Connected', connecting: 'Connecting...', qr: 'Scan QR', disconnected: 'Disconnected' }[state] || 'Disconnected';
  }

  /* ---------- actions ---------- */
  window.SA = {
    savePayment() { put('payment', { env: q('pEnv').value, clientId: v('pClientId'), secret: v('pSecret'), version: v('pVersion'), cbUser: v('pCbUser'), cbPass: v('pCbPass') }); toast('✅ Payment settings saved'); },
    setMode(m) { pr.mode = m; pr.dev = null; printerUI(); },
    setWidth(w) { pr.width = w; printerUI(); },
    async connectPrinter() {
      try {
        if (pr.mode === 'bluetooth') {
          if (!navigator.bluetooth) throw new Error('Bluetooth is not supported here. Use Chrome or Edge.');
          const d = await navigator.bluetooth.requestDevice({ acceptAllDevices: true }); pr.dev = d; pr.name = d.name || 'Bluetooth printer';
        } else {
          if (!navigator.serial) throw new Error('USB Serial is not supported here. Use Chrome or Edge.');
          pr.dev = await navigator.serial.requestPort(); pr.name = 'USB (Serial) printer';
        }
        printerUI(); toast('✅ Printer connected');
      } catch (e) { toast('⚠️ ' + (e.message || 'Could not connect')); }
    },
    savePrinter() { put('printer', { mode: pr.mode, width: pr.width, captain: q('prCaptain').checked, ask: q('prAsk').checked }); toast('✅ Printer options saved'); },
    printTest() {
      const w = window.open('', '_blank', 'width=420,height=600'); if (!w) return toast('⚠️ Allow pop-ups to print');
      const name = esc(getMe().brandName || 'Store');
      w.document.write(`<html><head><title>Test Receipt</title></head><body style="width:${pr.width === '58' ? '58mm' : '80mm'};font-family:monospace;font-size:12px"><div style="text-align:center"><b>${name}</b><br>TEST RECEIPT<br>${new Date().toLocaleString()}</div><hr>Printer connected OK<br>Paper width: ${pr.width}mm<hr><div style="text-align:center">Thank you!</div></body></html>`);
      w.document.close(); w.focus(); w.print();
    },
    waSave() { put('whatsapp', { phone: v('wPhone'), url: v('wUrl'), order: q('wOrder').checked, bill: q('wBill').checked }); toast('✅ WhatsApp settings saved'); },
    waConnect() {
      const token = localStorage.getItem('token');
      if (!token) return toast('⚠️ Login through the backend first (login.html), then connect');
      const url = v('wUrl') || 'ws://localhost:5000/wa'; setv('wUrl', url);
      if (!/^wss?:\/\//i.test(url)) return toast('⚠️ Enter a valid ws:// or wss:// URL');
      if (ws) { try { ws.close(); } catch (e) {} }
      waReady = false; waStatus('connecting'); q('waInfo').textContent = 'Connecting to server...';
      try {
        ws = new WebSocket(url);
        ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }));
        ws.onclose = () => { waReady = false; waStatus('disconnected'); q('waQrBox').classList.add('d-none'); q('waInfo').textContent = 'Not connected. Click Connect, then scan the QR code with WhatsApp.'; };
        ws.onerror = () => toast('❌ Socket server not reachable. Is the backend running with whatsapp.js enabled?');
        ws.onmessage = e => {
          let m; try { m = JSON.parse(e.data); } catch (err) { return; }
          if (m.type === 'qr') { q('waQr').src = m.qr; q('waQrBox').classList.remove('d-none'); waStatus('qr'); q('waInfo').textContent = 'Scan this QR with WhatsApp on your phone.'; }
          else if (m.type === 'ready') { waReady = true; q('waQrBox').classList.add('d-none'); waStatus('connected'); q('waInfo').textContent = 'Linked number: +' + (m.number || ''); toast('✅ WhatsApp connected'); }
          else if (m.type === 'status') {
            if (m.state === 'starting') q('waInfo').textContent = 'Starting WhatsApp (first time can take a minute)...';
            if (m.state === 'disconnected') { waReady = false; waStatus('disconnected'); q('waInfo').textContent = 'WhatsApp disconnected.'; }
          }
          else if (m.type === 'sent') toast('✅ Message sent');
          else if (m.type === 'error') toast('❌ ' + m.message);
        };
      } catch (e) { waStatus('disconnected'); toast('❌ ' + e.message); }
    },
    waDisconnect() { if (ws) { try { ws.close(); } catch (e) {} ws = null; } },
    waUnlink() { if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ type: 'logout' })); toast('Unlinking WhatsApp...'); } else toast('⚠️ Connect first'); },
    waTest() {
      const phone = v('wPhone').replace(/\D/g, ''); if (!phone) return toast('⚠️ Enter the WhatsApp number first');
      const msg = 'Hello from ' + (getMe().brandName || 'our store') + ' - this is a WhatsApp test message.';
      if (ws && ws.readyState === 1 && waReady) ws.send(JSON.stringify({ type: 'send', to: phone, message: msg }));
      else window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
    }
  };
})();