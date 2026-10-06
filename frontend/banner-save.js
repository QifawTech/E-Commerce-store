/* ===== banner-save.js =====
   Dashboard.html-la </body> ku munnadi paste pannu:
   <script src="banner-save.js"></script>

   Ithu "Save Banner" button click aagumbodhu form values-a padichu
   localStorage-la save pannum. Storefront (ecommerce-theme.html) adha padikkum.
*/
(function () {
  /* ---------- Store slug kandupidikkum ---------- */
  function getSlug() {
    // 1) URL la ?store= irundha adha use pannu
    var p = new URLSearchParams(location.search).get('store');
    if (p) return p;

    // 2) localStorage la user object la storeSlug irundha adha use pannu
    var keys = ['user', 'currentUser', 'loggedInUser', 'authUser'];
    for (var i = 0; i < keys.length; i++) {
      try {
        var raw = localStorage.getItem(keys[i]);
        if (!raw) continue;
        var u = JSON.parse(raw);
        if (u && u.storeSlug) return u.storeSlug;
      } catch (e) {}
    }
    return '';
  }

  /* ---------- Banner form elements kandupidikkum ---------- */
  function getVal(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  /* ---------- Banner image (base64) edukkanum ---------- */
  function getImage() {
    // 1) hidden preview image (id: beImgPreview) — dashboard la irukku
    var prev = document.getElementById('beImgPreview');
    if (prev && prev.src && prev.src.indexOf('data:') === 0) return prev.src;

    // 2) fallback — vera editable image irundha adha edukkanum
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      if (imgs[i].src && imgs[i].src.indexOf('data:') === 0 &&
          (imgs[i].id || '').toLowerCase().indexOf('banner') !== -1) {
        return imgs[i].src;
      }
    }
    return '';
  }

  /* ---------- Save handler ---------- */
  function saveBanner() {
    var banner = {
      eyebrow:  getVal('beEyebrow'),
      headline: getVal('beHeadline'),
      sub:      getVal('beSub'),
      btn1:     getVal('beBtn1'),
      btn2:     getVal('beBtn2'),
      img:      getImage(),
      updatedAt: new Date().toLocaleString()
    };

    var slug = getSlug();

    try {
      if (slug) {
        localStorage.setItem('smartstore_banner_' + slug, JSON.stringify(banner));
      }
      // Global fallback (slug theriyala na) — storefront ithuvum check pannum
      localStorage.setItem('smartstore_banner', JSON.stringify(banner));

      console.log('✅ Banner saved:', banner, '| slug:', slug || '(none)');
      return true;
    } catch (err) {
      console.error('❌ Banner save failed (image too big?)', err);
      alert('Banner save aagala. Image size romba perusa irukkalaam — chinna image try pannu.');
      return false;
    }
  }

  /* ---------- Click listener (capture phase) ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button, a');
    if (!btn) return;
    var label = (btn.textContent || '').toLowerCase();
    if (label.indexOf('save banner') === -1) return;

    e.preventDefault();
    e.stopPropagation();

    var ok = saveBanner();

    if (ok) {
      // 1) Toast message (dashboard la irundha)
      if (typeof window.toast === 'function') {
        window.toast('✅ Banner saved — preview updated');
      } else {
        // 2) Fallback alert
        var t = document.createElement('div');
        t.textContent = '✅ Banner saved';
        t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#10b981;color:#fff;padding:14px 28px;border-radius:12px;z-index:99999;font-weight:600;font-family:sans-serif;';
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 2000);
      }

      // 3) Preview iframe refresh pannu (irundha)
      var frame = document.getElementById('bannerFrame');
      if (frame && typeof window.reloadBannerPreview === 'function') {
        setTimeout(window.reloadBannerPreview, 250);
      } else if (frame && frame.src) {
        // manual reload fallback
        var src = frame.src;
        frame.src = 'about:blank';
        setTimeout(function () { frame.src = src; }, 150);
      }
    }
  }, true);
})();