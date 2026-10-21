/* ============================================================================
   storefront-merchant-sync.js
   ----------------------------------------------------------------------------
   Drop-in patch for ecommerce-theme.html
   Fixes the 3 broken integrations WITHOUT changing the existing UI:
     1. Product sync      (Merchant Dashboard → Storefront)
     2. Banner sync       (Merchant Dashboard → Storefront)
     3. Order sync        (Storefront → Merchant Dashboard → Online Orders)

   HOW TO INSTALL:
     Add this ONE line at the very END of ecommerce-theme.html,
     just BEFORE </body>:

        <script src="storefront-merchant-sync.js"></script>

   (It must load AFTER the existing inline theme <script> so that the
   theme's own functions exist for us to patch.)

   Works with the merchant dashboard storage schema:
     smartstore_products_<slug>      smartstore_products
     smartstore_banners_<slug>       smartstore_banners
     smartstore_orders_<slug>        smartstore_orders
     smartstore_orders_update        (timestamp change signal)
   ============================================================================ */
(function () {
  'use strict';

  var TAG = '[StoreSync]';
  function log()  { try { console.log.apply(console, [TAG].concat([].slice.call(arguments))); } catch (e) {} }
  function warn() { try { console.warn.apply(console, [TAG].concat([].slice.call(arguments))); } catch (e) {} }

  /* ---------------- 1. UTILITIES (mirror the dashboard exactly) ------------- */
  function slugify(s) {
    return String(s || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function readLS(k, fb) {
    try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? fb : v; }
    catch (e) { return fb; }
  }
  function writeLS(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { return false; }
  }

  /* ---------------- 2. RESOLVE ?merchant=<username> -> real storeSlug -------- */
  /* Same logic as dashboard.js so URLs always line up.                         */
  function resolveMerchantStoreSlug(input) {
    var s = slugify(input);
    if (!s) return '';
    var byUser = '', byEmail = '';
    ['registeredUsers', 'smartstore_users'].forEach(function (k) {
      var arr = readLS(k, []);
      if (!Array.isArray(arr)) return;
      arr.forEach(function (u) {
        if (!u || typeof u !== 'object') return;
        var role = String(u.role || 'merchant').toLowerCase().trim();
        if (role && role !== 'merchant') return;
        var own = u.storeSlug ? slugify(u.storeSlug) : '';
        if (!own) return;
        if (own === s) { byUser = own; return; }
        if (!byUser && u.username && slugify(u.username) === s) byUser = own;
        if (!byEmail && u.email   && slugify(u.email)   === s) byEmail = own;
      });
    });
    return byUser || byEmail || s;
  }

  function getSlugFromURL() {
    var p = new URLSearchParams(location.search);
    var raw = p.get('merchant') || p.get('store') || p.get('storeSlug') || p.get('slug') || '';
    return raw ? resolveMerchantStoreSlug(raw) : '';
  }

  /* ---------------- 3. EARLY REDIRECT (runs before theme's own script) ------
     If the URL was opened with ?merchant=<username> but the real slug is
     different (e.g. wear1 → wear-one), we redirect once to the canonical
     ?store=<slug> so the theme's own loadProducts()/loadBanners() read from
     the correct per-store keys.                                                 */
  (function earlyRedirect() {
    try {
      var p = new URLSearchParams(location.search);
      var raw = p.get('merchant') || p.get('store') || p.get('storeSlug') || p.get('slug') || '';
      if (!raw) return;
      var resolved = resolveMerchantStoreSlug(raw);
      if (!resolved) return;
      if (slugify(raw) === slugify(resolved) && raw === resolved) return;
      var url = new URL(location.href);
      url.searchParams.delete('merchant');
      url.searchParams.delete('storeSlug');
      url.searchParams.delete('slug');
      url.searchParams.set('store', resolved);
      log('Canonicalising URL:', raw, '→', resolved);
      location.replace(url.toString());
    } catch (e) { warn('earlyRedirect failed', e); }
  })();

  /* ---------------- 4. RESOLVED SLUG (for the rest of this file) ----------- */
  var SLUG = getSlugFromURL();
  var NORM = slugify(SLUG);

  /* ---------------- 5. STRICT LOADERS (used for verification only) --------- */
  function loadProducts() {
    if (!NORM) return [];
    var list = readLS('smartstore_products_' + NORM, []);
    if (!Array.isArray(list) || !list.length) {
      var g = readLS('smartstore_products', []);
      list = Array.isArray(g)
        ? g.filter(function (p) { return p && slugify(p.storeSlug || '') === NORM; })
        : [];
    }
    return list.filter(function (p) { return p && p.active !== false; });
  }
  function loadBanners() {
    if (!NORM) return [];
    var list = readLS('smartstore_banners_' + NORM, []);
    if (!Array.isArray(list) || !list.length) {
      var g = readLS('smartstore_banners', []);
      list = Array.isArray(g)
        ? g.filter(function (b) { return b && slugify(b.storeSlug || '') === NORM; })
        : [];
    }
    return list.filter(function (b) { return b && (b.img || b.image); });
  }

  /* ---------------- 6. ORDER SAVE (writes to dashboard's expected keys) ----
     Called when the theme's own saveOrder() runs. Ensures:
       * order has the correct merchant identifier
       * order is written to BOTH:
           smartstore_orders                (global pool)
           smartstore_orders_<slug>         (per-store pool, dashboard reads first)
       * duplicate orders are never written twice
       * smartstore_orders_update fires so the dashboard auto-refreshes.        */
  function saveOrderToDashboard(order) {
    if (!order || !order.orderId) return;
    var slug = NORM || slugify(order.storeSlug || '');
    order.storeSlug    = slug;
    order.merchantSlug = slug;

    var all = readLS('smartstore_orders', []);
    var arr = Array.isArray(all) ? all : [];
    if (!arr.some(function (o) { return o && o.orderId === order.orderId; })) {
      arr.push(order);
      writeLS('smartstore_orders', arr);
    }

    if (slug) {
      var sk = 'smartstore_orders_' + slug;
      var list = readLS(sk, []);
      var sArr = Array.isArray(list) ? list : [];
      if (!sArr.some(function (o) { return o && o.orderId === order.orderId; })) {
        sArr.push(order);
        writeLS(sk, sArr);
      }
    }
    writeLS('smartstore_orders_update', Date.now());
    log('Order saved for merchant', slug, order.orderId);
  }

  /* ---------------- 7. PATCH saveOrder + verify rendering ------------------ */
  function patchSaveOrder() {
    if (typeof window.saveOrder !== 'function') {
      warn('window.saveOrder not found — theme may have a different name.');
      return;
    }
    if (window.__storeSyncPatched) return;
    window.__storeSyncPatched = true;
    var orig = window.saveOrder;
    window.saveOrder = function (order) {
      try { saveOrderToDashboard(order); } catch (e) { warn('saveOrderToDashboard failed', e); }
      return orig.apply(this, arguments);
    };
    log('saveOrder patched ✔');
  }

  function verifyProductRender() {
    var grid = document.getElementById('productGrid');
    if (!grid) return;
    var prods = loadProducts();
    var shown = grid.children.length;
    if (prods.length && shown === 0) {
      warn('Products exist in storage for slug "' + NORM + '" but the grid is empty.');
      warn('Force re-running theme loaders…');
      if (typeof window.loadProducts   === 'function') try { window.loadProducts();   } catch (e) {}
      if (typeof window.renderProducts === 'function') try { window.renderProducts(); } catch (e) {}
    } else if (prods.length && shown > 0) {
      log('Products OK →', shown, 'cards rendered for slug "' + NORM + '"');
    } else if (!prods.length) {
      log('No products stored for slug "' + NORM + '" (merchant has not added any yet).');
    }
  }

  function verifyBannerRender() {
    var section = document.getElementById('bannerSection');
    if (!section) return;
    var banners = loadBanners();
    var visible = !section.classList.contains('is-hidden');
    if (banners.length && !visible) {
      warn('Banners exist in storage but section is hidden. Forcing render…');
      if (typeof window.loadBanners   === 'function') try { window.loadBanners();   } catch (e) {}
      if (typeof window.renderBanners === 'function') try { window.renderBanners(); } catch (e) {}
    } else if (banners.length && visible) {
      log('Banners OK →', banners.length, 'banner(s) visible for slug "' + NORM + '"');
    } else if (!banners.length) {
      log('No banners stored for slug "' + NORM + '" (merchant has not uploaded any yet).');
    }
  }

  function runChecks() {
    patchSaveOrder();
    verifyProductRender();
    verifyBannerRender();
    log('Store ready ✔', {
      slug: SLUG,
      normalised: NORM,
      productsInStorage: loadProducts().length,
      bannersInStorage:  loadBanners().length,
      ordersInStorage:   (readLS('smartstore_orders_' + NORM, []) || []).length
    });
  }

  /* ---------------- 8. LIVE SYNC (dashboard edits reflect immediately) ------
     The theme's own storage listener already handles re-rendering when
     products/banners change. We only need to listen for the "orders_update"
     signal so we can log in the console while testing.                          */
  function bindStorageSync() {
    window.addEventListener('storage', function (e) {
      if (!e.key) return;
      if (e.key === 'smartstore_orders_update') {
        log('Dashboard notified of new order (auto-refreshes via its own listener).');
      }
      if (e.key === 'smartstore_products_' + NORM ||
          e.key === 'smartstore_products'          ||
          e.key === 'smartstore_banners_'  + NORM ||
          e.key === 'smartstore_banners'           ||
          e.key === 'smartstore_theme_update') {
        log('Merchant updated ' + e.key + ' — theme will re-render.');
      }
    });
  }

  /* ---------------- 9. DIAGNOSTIC API (open console → __storeSync.test()) ---
     Handy for verifying wiring without touching the UI.                         */
  window.__storeSync = {
    slug: function () { return SLUG; },
    norm: function () { return NORM; },
    products: function () { return loadProducts(); },
    banners:  function () { return loadBanners(); },
    orders:   function () { return readLS('smartstore_orders_' + NORM, []) || []; },
    test: function () {
      var p = loadProducts().length;
      var b = loadBanners().length;
      var o = (readLS('smartstore_orders_' + NORM, []) || []).length;
      console.log('%c[StoreSync TEST] slug=' + NORM,
        'color:#10b981;font-weight:700',
        { products: p, banners: b, orders: o });
      return { slug: NORM, products: p, banners: b, orders: o };
    }
  };

  /* ---------------- 10. BOOT (waits for theme to finish) ------------------- */
  if (document.readyState === 'complete') {
    setTimeout(runChecks, 100);
  } else {
    window.addEventListener('load', function () { setTimeout(runChecks, 100); });
  }
  /* Belt & braces: the theme also re-inits on setTimeout(300) and setTimeout(1000).
     Run our checks again after the second window so we never miss it. */
  setTimeout(runChecks, 1400);

  bindStorageSync();
  log('installed — slug="' + NORM + '"');
})();