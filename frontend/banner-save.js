/* =========================================================
   SmartStore — Online Orders + Sales (per-merchant) patch  v2
   Load AFTER the main dashboard <script>, before </body>.
   Reads the exact order shape written by ecommerce-theme.html
   (orderId, items[{name,qty,unitPrice,variant}], totalAmount,
    customerName/Phone/Email, address, deliveryAddress,
    paymentMethod, paymentStatus, orderStatus, orderDateISO, storeSlug)
   and the POS sale shape written by posCheckout().
   ========================================================= */

if (typeof readLS !== 'function') {
  window.readLS = function (k, d) {
    try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; }
  };
}
/* Called by the dashboard but not defined in dashboard.html */
if (typeof renderReports !== 'function') window.renderReports = function () {};
if (typeof renderTopSellingFull !== 'function') window.renderTopSellingFull = function () {};

function _ordKey(o) { return String(o.orderId || o.id || o.orderNumber || o._id || ''); }
function _ordDate(o) { return o.orderDateISO || o.createdAt || o.date || o.orderDate || o.placedAt || 0; }
function _belongsToStore(o, slug) {
  const f = o.storeSlug || o.store_slug || o.merchantSlug || o.merchant_slug || o.store || o.merchant || '';
  if (f) return slugify(f) === slug;
  return countRegisteredMerchants() <= 1;
}
function _dedupe(list) {
  const seen = new Set(), out = [];
  list.forEach(o => {
    if (!o || typeof o !== 'object') return;
    const k = _ordKey(o);
    if (k) { if (seen.has(k)) return; seen.add(k); }
    out.push(o);
  });
  out.sort((a, b) => new Date(_ordDate(b)) - new Date(_ordDate(a)));
  return out;
}

/* Merge the per-store bucket and the shared pool (this store only), no duplicates. */
function syncOrdersSalesFromStorage() {
  const slug = getCurrentStoreSlug();
  const arr = (v) => Array.isArray(v) ? v : [];
  const pool = (v) => arr(v).filter(o => o && typeof o === 'object' && _belongsToStore(o, slug));
  state.orders = _dedupe([].concat(state.orders || [], arr(readLS(ordersStorageKey(), [])), pool(readLS('smartstore_orders', [])))
    .filter(o => o && !isPosRecord(o)));
  state.sales = _dedupe([].concat(state.sales || [], arr(readLS(salesStorageKey(), [])), pool(readLS('smartstore_sales', []))));
}

/* Always merge before hydrate/persist so storefront orders are never overwritten. */
(function () {
  const _hydrate = hydrateOrdersAndSales;
  hydrateOrdersAndSales = function () { _hydrate(); syncOrdersSalesFromStorage(); };
  const _persist = persistOrdersAndSales;
  persistOrdersAndSales = function () { syncOrdersSalesFromStorage(); _persist(); };
})();

function _ordAddress(o) {
  if (o.deliveryAddress) return String(o.deliveryAddress);
  const a = o.address;
  if (a && typeof a === 'object') {
    return [a.house, a.street, a.area, a.city, a.state].filter(Boolean).join(', ') + (a.pincode ? ' - ' + a.pincode : '');
  }
  return a ? String(a) : '';
}

function _ordView(o) {
  const c = o.customer;
  const customer = (c && typeof c === 'object') ? (c.name || c.email || c.phone || '-') : (c || o.customerName || o.name || '-');
  const raw = Array.isArray(o.items) ? o.items : (Array.isArray(o.products) ? o.products : []);
  const items = raw.map(it => ({
    name: it.name || it.title || it.productName || 'Item',
    qty: Number(it.qty || it.quantity || 1) || 1,
    price: Number(it.unitPrice ?? it.price ?? 0) || 0,
    variant: it.variant || ''
  }));
  const total = Number(o.totalAmount ?? o.total ?? o.amount ?? o.grandTotal) || items.reduce((a, i) => a + i.qty * i.price, 0);
  return {
    id: _ordKey(o) || '-', customer, date: _ordDate(o), items, total,
    phone: o.customerPhone || (c && c.phone) || o.customerMobile || '',
    email: o.customerEmail || (c && c.email) || '',
    address: _ordAddress(o),
    status: String(o.orderStatus || o.status || 'pending').toLowerCase(),
    type: isPosRecord(o) ? 'POS' : 'Online',
    payment: o.paymentMethod || o.payment || '', paymentStatus: o.paymentStatus || '',
    subtotal: o.subtotal, discount: o.discount
  };
}
function _ordItemsText(items) {
  if (!items.length) return '-';
  const s = items.slice(0, 3).map(i =>
    esc(i.name) + (i.variant ? ' (' + esc(i.variant) + ')' : '') + ' × ' + i.qty +
    (i.price ? ' <span class="text-secondary small">@ ' + money(i.price) + '</span>' : '')
  ).join('<br>');
  return items.length > 3 ? s + '<br><span class="text-secondary small">+' + (items.length - 3) + ' more</span>' : s;
}
function _ordWhen(d) { const t = new Date(d); return isNaN(t.getTime()) ? '-' : t.toLocaleString(); }

function setOrderStatus(s) { state.orderStatus = s || 'all'; renderOrders(); }

function renderOrders() {
  const body = $('orderBody'); if (!body) return;
  syncOrdersSalesFromStorage();
  const all = state.orders.map(_ordView);
  const statuses = ['all'].concat(Array.from(new Set(all.map(o => o.status))));
  if (statuses.indexOf(state.orderStatus) === -1) state.orderStatus = 'all';
  const tabs = $('orderStatusTabs');
  if (tabs) tabs.innerHTML = statuses.map(s =>
    `<div class="acc-tab ${state.orderStatus === s ? 'active' : ''}" data-s="${esc(s)}" onclick="setOrderStatus(this.dataset.s)">${esc(s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1))}</div>`
  ).join('');
  const q = (($('orderSearch') || {}).value || '').trim().toLowerCase();
  const list = all.filter(o => (state.orderStatus === 'all' || o.status === state.orderStatus) && (!q || o.id.toLowerCase().includes(q)));
  body.innerHTML = list.length ? list.map(o => {
    const sub = [o.phone, o.email].filter(Boolean).map(esc).join(' · ');
    const pay = [o.payment, o.paymentStatus].filter(Boolean).map(esc).join(' · ');
    return `<tr>
      <td><strong>${esc(o.id)}</strong></td>
      <td>${esc(o.customer)}${sub ? `<div class="text-secondary small">${sub}</div>` : ''}${o.address ? `<div class="text-secondary small">${esc(o.address)}</div>` : ''}</td>
      <td>${esc(_ordWhen(o.date))}</td>
      <td>${_ordItemsText(o.items)}</td>
      <td>${money(o.total)}${pay ? `<div class="text-secondary small">${pay}</div>` : ''}</td>
      <td>${esc(o.type)}</td>
      <td>${statusBadge(o.status)}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="7" class="text-center text-secondary py-4">No orders yet</td></tr>';
  const cnt = $('orderCount'); if (cnt) cnt.textContent = list.length;
}

function renderSales() {
  const body = $('salesBody'); if (!body) return;
  syncOrdersSalesFromStorage();
  const list = state.sales.map(_ordView).filter(s => s.status === 'completed');
  const total = list.reduce((a, s) => a + s.total, 0);
  const itemsSold = list.reduce((a, s) => a + s.items.reduce((x, i) => x + i.qty, 0), 0);
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('salesTotal', money(total));
  set('salesOrders', list.length);
  set('salesAvg', money(list.length ? total / list.length : 0));
  set('salesItems', itemsSold);
  set('salesCount', list.length);
  body.innerHTML = list.length ? list.map((s, i) => {
    const extra = [];
    if (s.subtotal !== undefined) extra.push('Subtotal ' + money(s.subtotal));
    if (Number(s.discount) > 0) extra.push('Discount −' + money(s.discount));
    if (s.payment) extra.push(esc(s.payment));
    return `<tr>
      <td>${i + 1}</td>
      <td><strong>${esc(s.id)}</strong><div class="text-secondary small">${esc(s.type)}</div></td>
      <td>${esc(s.customer)}</td>
      <td>${_ordItemsText(s.items)}</td>
      <td>${money(s.total)}${extra.length ? `<div class="text-secondary small">${extra.join(' · ')}</div>` : ''}</td>
      <td>${statusBadge(s.status)}</td>
      <td>${esc(_ordWhen(s.date))}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="7" class="text-center text-secondary py-4">No sales yet</td></tr>';
}

/* Storefront order placed in another tab → refresh live (shared pool keys). */
window.addEventListener('storage', (e) => {
  if (e.key === 'smartstore_orders' || e.key === 'smartstore_sales') {
    syncOrdersSalesFromStorage();
    const ov = $('view-orders'); if (ov && !ov.classList.contains('d-none')) renderOrders();
    const sv = $('view-sales'); if (sv && !sv.classList.contains('d-none')) renderSales();
    renderDashboard();
  }
});