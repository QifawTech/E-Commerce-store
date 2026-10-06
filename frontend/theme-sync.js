/* theme-sync.js
   Add this ONE line at the end of ecommerce-theme.html (before </body>):
       <script src="theme-sync.js"></script>
   It applies the merchant's saved theme (name, accent colour, banner text/image, footer)
   from localStorage, updates live while the merchant edits, and works in
   Visit Store / Live Preview / dashboard preview.

   Optional exact hooks (if you want full control), put these attributes in ecommerce-theme.html:
     data-theme="name"  data-theme="banner"  data-theme="bannerText"  data-theme="footer"
*/
(function () {
  if (window.__themeSync) return;
  window.__themeSync = true;

  var qs = new URLSearchParams(location.search);
  function lsList(k) { try { return JSON.parse(localStorage.getItem(k) || '[]') || []; } catch (e) { return []; } }
  function mySlug() {
    var s = qs.get('store');
    if (s) return s;
    try { return (JSON.parse(localStorage.getItem('user') || '{}') || {}).storeSlug || ''; } catch (e) { return ''; }
  }
  function readSaved() {
    var slug = mySlug();
    var t = lsList('smartstore_themes').filter(function (x) { return (x.storeSlug || '') === slug; })[0] || {};
    var b = lsList('smartstore_banners').filter(function (x) { return (x.storeSlug || '') === slug; })[0] || {};
    return { name: t.name || '', color: t.color || '', footer: t.footer || '', bannerText: b.text || '', bannerImage: b.image || '' };
  }

  var cs0 = getComputedStyle(document.documentElement);
  var ORIG_INK = cs0.getPropertyValue('--ink').trim();
  var ORIG_INK2 = cs0.getPropertyValue('--ink-2').trim();

  var current = readSaved();
  var obs = null, timer = null, primaryKey = null;

  /* ---------- helpers to remember originals ---------- */
  function orig(el) { return el.__ts || (el.__ts = {}); }
  function setText(el, val) {
    var o = orig(el);
    if (!('text' in o)) o.text = el.textContent;
    el.textContent = val ? val : o.text;
  }

  /* ---------- accent colour ---------- */
  function parseRgb(s) {
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(s || '');
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4], key: m[1] + ',' + m[2] + ',' + m[3] };
  }
  function candidate(c) {
    if (!c || c.a < 1) return false;
    var max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
    if (max - min < 30) return false;            // grey / white
    var l = (max + min) / 510;
    return l > 0.05 && l < 0.6;                  // not too light
  }
  function detectPrimary(els) {
    var count = {}, best = null, bc = 0;
    els.forEach(function (el) {
      if (el.tagName === 'IMG' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
      var c = parseRgb(getComputedStyle(el).backgroundColor);
      if (!candidate(c)) return;
      count[c.key] = (count[c.key] || 0) + 1;
      if (count[c.key] > bc) { bc = count[c.key]; best = c.key; }
    });
    return best;
  }
  function hasInk() {
    return getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() !== '';
  }
  function tagColors() {
    if (hasInk()) return;   /* page uses CSS variables -> no scanning needed */
    var els = Array.prototype.slice.call(document.body.querySelectorAll('*'));
    if (!primaryKey) primaryKey = detectPrimary(els);
    if (!primaryKey) return;
    els.forEach(function (el) {
      if (el.hasAttribute('data-ts-done')) return;
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
      var cs = getComputedStyle(el);
      var bg = parseRgb(cs.backgroundColor), fg = parseRgb(cs.color), bd = parseRgb(cs.borderTopColor);
      if (bg && bg.a === 1 && bg.key === primaryKey) el.setAttribute('data-ts-bg', '');
      if (fg && fg.key === primaryKey) el.setAttribute('data-ts-fg', '');
      if (bd && bd.key === primaryKey && parseFloat(cs.borderTopWidth) > 0) el.setAttribute('data-ts-bd', '');
      el.setAttribute('data-ts-done', '');
    });
  }
  function applyColor(color) {
    var st = document.getElementById('ts-style');
    if (!st) { st = document.createElement('style'); st.id = 'ts-style'; document.head.appendChild(st); }
    if (!color) { st.textContent = ''; return; }
    st.textContent =
      ':root{--ink:' + color + ';--ink-2:' + color +
      ';--accent:' + color + ';--primary:' + color + ';--brand:' + color + ';--theme-color:' + color +
      ';--accent-color:' + color + ';--primary-color:' + color + ';--brand-color:' + color + ';--ts-accent:' + color + '}' +
      '[data-ts-bg]{background-color:' + color + '!important}' +
      '[data-ts-fg]{color:' + color + '!important}' +
      '[data-ts-bd]{border-color:' + color + '!important}' +
      /* footer + Login/Register + auth popup keep the ORIGINAL dark green */
      (ORIG_INK ? 'footer,.btn-login,.btn-register,#authOverlay{--ink:' + ORIG_INK + ';--ink-2:' + (ORIG_INK2 || ORIG_INK) + '}' : '');
  }

  /* ---------- store name ---------- */
  var brandEl = null;
  function findBrand() {
    if (brandEl && document.contains(brandEl)) return brandEl;
    var sel = document.querySelector('[data-theme="name"], #storeName, #brandName, .store-name, .brand-name, .logo-text, .brand-text');
    if (sel) return (brandEl = sel);
    var hdr = document.querySelector('header, .header, .topbar, .navbar, nav') || document.body;
    var best = null, bl = 1e9, bt = 1e9;
    hdr.querySelectorAll('*').forEach(function (el) {
      if (el.children.length) return;
      var tx = (el.textContent || '').trim();
      if (!tx || tx.length > 30) return;
      if (/^(login|register|sign|home|cart|search|all|deals|track)/i.test(tx)) return;
      if (el.closest('button,[role=button],input,.btn,ul,ol,form,select')) return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (r.left < bl || (r.left === bl && r.top < bt)) { best = el; bl = r.left; bt = r.top; }
    });
    return (brandEl = best);
  }
  function applyName(name) {
    var hit = false;
    ['brandName', 'footBrand', 'footBrand2'].forEach(function (id) {
      var e = document.getElementById(id);
      if (e) { setText(e, name); hit = true; }
    });
    if (hit) return;
    var el = findBrand();
    if (el) setText(el, name);
  }

  /* ---------- banner ---------- */
  function findHero() {
    var q = document.querySelector('[data-theme="banner"], #hero, #banner, .hero, .hero-banner, .hero-section, .banner, .banner-section, .promo-banner');
    if (q) return q;
    var all = document.querySelectorAll('[class*="hero"],[class*="banner"],[id*="hero"],[id*="banner"],[class*="carousel"],[class*="slider"]');
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (e.tagName === 'IMG') continue;
      if ((e.id || '').indexOf('ts-') === 0 || (e.className && String(e.className).indexOf('ts-') > -1)) continue;
      if (e.getBoundingClientRect().height > 60) return e;
    }
    return null;
  }
  function makeHero() {
    var h = document.getElementById('ts-banner');
    if (h) return h;
    h = document.createElement('section');
    h.id = 'ts-banner';
    h.style.cssText = 'min-height:230px;margin:16px 30px;border-radius:18px;display:flex;align-items:center;justify-content:center;' +
      'background:#0f3d3e center/cover no-repeat;color:#fff;font-size:2rem;font-weight:800;text-align:center;padding:24px;' +
      'text-shadow:0 2px 12px rgba(0,0,0,.45);position:relative;overflow:hidden';
    var anchor = document.querySelector('header, .navbar, nav');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(h, anchor.nextSibling);
    else document.body.insertBefore(h, document.body.firstChild);
    return h;
  }
  function applyBanner(text, img) {
    var hl = document.getElementById('bannerHeadline'), bi = document.getElementById('bannerImg');
    if (hl || bi) {
      if (hl) setText(hl, text);
      if (bi) {
        var o0 = orig(bi);
        if (!('src' in o0)) o0.src = bi.getAttribute('src');
        bi.setAttribute('src', img || o0.src);
      }
      return;
    }
    var hero = findHero();
    if (!hero && (text || img)) hero = makeHero();
    if (!hero) return;
    var mine = hero.id === 'ts-banner';
    if (mine) hero.style.display = (text || img) ? 'flex' : 'none';

    /* image */
    var o = orig(hero);
    var im = hero.querySelector('img');
    if (im && im.getBoundingClientRect().width > 80) {
      var oi = orig(im);
      if (!('src' in oi)) oi.src = im.getAttribute('src');
      im.setAttribute('src', img || oi.src);
    } else {
      if (!('bg' in o)) o.bg = hero.style.getPropertyValue('background-image');
      if (img) {
        hero.style.setProperty('background-image', 'url("' + img.replace(/"/g, '%22') + '")', 'important');
        hero.style.setProperty('background-size', 'cover', 'important');
        hero.style.setProperty('background-position', 'center', 'important');
      } else if (mine) {
        hero.style.removeProperty('background-image');
      } else {
        if (o.bg) hero.style.setProperty('background-image', o.bg); else hero.style.removeProperty('background-image');
      }
    }

    /* text */
    var t = hero.querySelector('[data-theme="bannerText"], h1, h2, .hero-title, .banner-title, .banner-text, .hero-text');
    if (!t && mine) {
      t = hero.querySelector('.ts-bt');
      if (!t) { t = document.createElement('div'); t.className = 'ts-bt'; hero.appendChild(t); }
    }
    if (t) setText(t, text);
    else if (text) {
      if (getComputedStyle(hero).position === 'static') hero.style.position = 'relative';
      t = hero.querySelector('.ts-bt');
      if (!t) {
        t = document.createElement('div'); t.className = 'ts-bt';
        t.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:2rem;font-weight:800;text-shadow:0 2px 12px rgba(0,0,0,.5);text-align:center;padding:16px;pointer-events:none';
        hero.appendChild(t);
      }
      t.textContent = text;
    } else {
      var x = hero.querySelector('.ts-bt'); if (x) x.remove();
    }
  }

  /* ---------- footer ---------- */
  var copyEl = null;
  function applyFooter(text) {
    if (!copyEl) { var fb = document.getElementById('footBrand2'); if (fb) copyEl = fb.parentElement; }
    if (copyEl) {
      var oc = orig(copyEl);
      if (!('html' in oc)) oc.html = copyEl.innerHTML;
      if (text) copyEl.textContent = text; else copyEl.innerHTML = oc.html;
      return;
    }
    var f = document.querySelector('[data-theme="footer"], footer, #footer, .footer, .site-footer');
    if (!f && text) {
      f = document.createElement('footer');
      f.id = 'ts-footer';
      f.style.cssText = 'padding:18px;text-align:center;font-size:.85rem;color:#64748b;border-top:1px solid #e5e7eb;margin-top:24px';
      document.body.appendChild(f);
    }
    if (!f) return;
    if (f.id === 'ts-footer') { f.textContent = text; f.style.display = text ? '' : 'none'; return; }
    var target = null;
    f.querySelectorAll('*').forEach(function (el) {
      if (target || el.children.length) return;
      if (/©|rights|copyright/i.test(el.textContent)) target = el;
    });
    if (!target && !f.children.length && f.textContent.trim()) target = f;
    if (!target) {
      target = f.querySelector('.ts-ft');
      if (!target && text) { target = document.createElement('div'); target.className = 'ts-ft'; target.style.cssText = 'text-align:center;padding:8px'; f.appendChild(target); }
    }
    if (target) setText(target, text);
  }

  /* ---------- run everything ---------- */
  function apply() {
    if (!document.body) return;
    if (obs) obs.disconnect();
    try {
      tagColors();
      applyColor(current.color);
      applyFooter(current.footer);
      applyName(current.name);
      applyBanner(current.bannerText, current.bannerImage);
    } catch (e) { console.warn('theme-sync:', e); }
    if (obs) obs.observe(document.body, { childList: true, subtree: true });
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(apply, 250); }

  obs = new MutationObserver(schedule);

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'themeUpdate') return;
    if (e.source !== window.parent) return;
    current = { name: d.name || '', color: d.color || '', footer: d.footer || '', bannerText: d.bannerText || '', bannerImage: d.bannerImage || '' };
    apply();
  });
  window.addEventListener('storage', function (e) {
    if (!e.key || e.key === 'smartstore_themes' || e.key === 'smartstore_banners') { current = readSaved(); apply(); }
  });

  function start() { apply(); setTimeout(apply, 600); setTimeout(apply, 1800); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();