/* dashboard-orders-fix.js - Online Orders for the logged-in merchant's store */
(function () {
  'use strict';

  // Same normalisation as ecommerce-theme.html (so slugs always match)
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  function readJSON(k, fb) {
    try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? fb : v; } catch (e) { return fb; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN'); }

  // 1. Active merchant slug: dashboard helper -> URL -> logged-in merchant record
  function getActiveSlug() {
    var s = '';
    if (typeof window.getCurrentStoreSlug === 'function') {
      try { s = window.getCurrentStoreSlug() || ''; } catch (e) {}
    }
    if (!s) {
      var p = new URLSearchParams(location.search || '');
      s = p.get('merchant') || p.get('store') || p.get('storeSlug') || p.get('slug') || '';
    }
    if (!s) {
      var me = readJSON('smartstore_current_user', null) || readJSON('user', null);
      if (me && me.storeSlug) s = me.storeSlug;
    }
    return norm(s);
  }

  // 2. Orders that belong ONLY to this merchant (de-duplicated by orderId)
  function loadStoreOrders() {
    var slug = getActiveSlug();
    if (!slug) return [];

    var perStore = readJSON('smartstore_orders_' + slug, []);
    var all = readJSON('smartstore_orders', []);
    if (!Array.isArray(perStore)) perStore = [];
    if (!Array.isArray(all)) all = [];

    var seen = {}, out = [];
    function add(o) {
      if (!o || !o.orderId || seen[o.orderId]) return;
      seen[o.orderId] = 1;
      out.push(o);
    }
    perStore.forEach(add);
    all.forEach(function (o) {
      if (!o) return;
      if (norm(o.storeSlug) === slug || norm(o.merchantSlug) === slug) add(o);
    });

    return out.sort(function (a, b) {
      return new Date(b.createdAt || b.orderDateISO || 0) - new Date(a.createdAt || a.orderDateISO || 0);
    });
  }

  // 3. Render into the EXISTING table (same 7 columns, no layout change)
  window.renderOrders = function () {
    var body = document.getElementById('orderBody');
    if (!body) return;

    var orders = loadStoreOrders();

    var searchInput = document.getElementById('orderSearch');
    var q = searchInput ? searchInput.value.toLowerCase() : '';
    if (q) {
      orders = orders.filter(function (o) {
        return String(o.orderId).toLowerCase().indexOf(q) !== -1 ||
               String(o.customerName || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    var tabsWrap = document.getElementById('orderStatusTabs');
    if (tabsWrap && tabsWrap.children.length === 0) {
      var statuses = ['all', 'Pending', 'Shipped', 'Delivered', 'Cancelled'];
      tabsWrap.innerHTML = statuses.map(function (st) {
        return '<div class="acc-tab ' + (st === 'all' ? 'active' : '') +
          '" onclick="window.__filterOrdersTab(\'' + st + '\', this)">' + (st === 'all' ? 'All' : st) + '</div>';
      }).join('');
    }

    var activeTabEl = tabsWrap ? tabsWrap.querySelector('.acc-tab.active') : null;
    var activeStatus = activeTabEl ? activeTabEl.textContent.trim().toLowerCase() : 'all';
    if (activeStatus !== 'all') {
      orders = orders.filter(function (o) {
        return String(o.orderStatus || o.status || 'Pending').toLowerCase() === activeStatus;
      });
    }

    var cnt = document.getElementById('orderCount');
    if (cnt) cnt.textContent = orders.length;

    if (!orders.length) {
      body.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-4">No orders yet</td></tr>';
      return;
    }

    body.innerHTML = orders.map(function (o) {
      var itemsHtml = (o.items || []).map(function (it) {
        return esc(it.name) + (it.variant ? ' (' + esc(it.variant) + ')' : '') +
          ' × ' + (it.qty || 1) + ' @ ' + money(it.unitPrice);
      }).join('<br>');
      if (!itemsHtml && o.productName) {
        itemsHtml = esc(o.productName) + ' × ' + (o.quantity || 1);
      }

      var st = String(o.orderStatus || o.status || 'Pending');
      var stClass = st.toLowerCase().replace(/[^a-z]/g, '');
      var total = Number(o.totalAmount || o.amount || o.total) || 0;
      var date = o.orderDate || (o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN') : '');

      return '<tr>' +
        '<td><b>' + esc(o.orderId) + '</b></td>' +
        '<td>' + esc(o.customerName) +
          '<br><small class="text-secondary">' + esc(o.customerPhone || '') + '</small>' +
          (o.deliveryAddress ? '<br><small class="text-secondary">' + esc(o.deliveryAddress) + '</small>' : '') +
        '</td>' +
        '<td>' + esc(date) + '</td>' +
        '<td>' + itemsHtml + '</td>' +
        '<td><b>' + money(total) + '</b></td>' +
        '<td>Online<br><small class="text-secondary">' + esc(o.paymentMethod || 'COD') +
          (o.paymentStatus ? ' · ' + esc(o.paymentStatus) : '') + '</small></td>' +
        '<td><span class="report-status-badge ' + stClass + '">' + esc(st) + '</span></td>' +
      '</tr>';
    }).join('');
  };

  window.__filterOrdersTab = function (status, el) {
    var wrap = document.getElementById('orderStatusTabs');
    if (wrap) wrap.querySelectorAll('.acc-tab').forEach(function (t) { t.classList.remove('active'); });
    if (el) el.classList.add('active');
    window.renderOrders();
  };

  function refreshIfVisible() {
    var view = document.getElementById('view-orders');
    if (!view || !view.classList.contains('d-none')) window.renderOrders();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.renderOrders);
  else window.renderOrders();

  // New order placed in another tab / coming back to the dashboard tab
  window.addEventListener('storage', function (e) {
    if (e.key && e.key.indexOf('smartstore_orders') === 0) refreshIfVisible();
  });
  window.addEventListener('focus', refreshIfVisible);
})();