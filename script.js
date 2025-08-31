/* script.js (FULL replacement)
   Replaces loader with a real asset-aware preloader while preserving
   all your existing functionality (audio unlock, hamburger, blobs, overlays).
*/

/* —————————————————————————————————
   Audio: elements, volumes & unlock
   ————————————————————————————————— */
const sfxRed    = document.getElementById('sfx-red');
const sfxBlue   = document.getElementById('sfx-blue');
const sfxTeal   = document.getElementById('sfx-teal');
const sfxPink   = document.getElementById('sfx-pink');
const sfxLime   = document.getElementById('sfx-lime');
const sfxPurple = document.getElementById('sfx-purple');

let audioUnlocked = false;

// default volumes (0.0 - 1.0)
const audioSettings = [
  { el: sfxRed,    vol: 0.5 },
  { el: sfxBlue,   vol: 0.3 },
  { el: sfxTeal,   vol: 0.8 },
  { el: sfxPink,   vol: 0.6 },
  { el: sfxLime,   vol: 0.7 },
  { el: sfxPurple, vol: 0.9 }
];

function applyAudioVolumes() {
  audioSettings.forEach(({ el, vol }) => {
    if (el) el.volume = vol;
  });
}

function unlockAudio() {
  applyAudioVolumes();
  audioSettings.forEach(({ el }) => {
    if (!el) return;
    // Play a short muted play to unlock on some mobile browsers
    el.muted = true;
    el.play().catch(() => {})
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = false;
      });
  });
  audioUnlocked = true;
}

// try unlock once on first click anywhere
document.addEventListener('click', () => {
  if (!audioUnlocked) unlockAudio();
}, { once: true });


/* —————————————————————————————————
   Useful DOM refs (guarded)
   ————————————————————————————————— */
const loaderEl      = document.querySelector('.loader');
const percentEl     = document.querySelector('.loading-percentage');
const homepageEl    = document.querySelector('.homepage');
const splashOverlay = document.querySelector('.splash-overlay');
const enterBtn      = document.getElementById('enter-btn');

const hamburger     = document.querySelector('.hamburger');
const menu          = document.querySelector('.dropdown-menu');


/* —————————————————————————————————
   Asset-aware preloader
   - tracks <img> and audio elements,
   - also scans CSS background-image urls and preloads them,
   - updates loader percentage based on actual assets loaded.
   - has a safety timeout to avoid infinite waiting.
   ————————————————————————————————— */

function extractUrlsFromStyle(styleValue) {
  // Extract url(...) occurrences from a CSS property string
  const urls = [];
  if (!styleValue || styleValue === 'none') return urls;
  const regex = /url\((['"]?)(.*?)\1\)/g;
  let match;
  while ((match = regex.exec(styleValue)) !== null) {
    if (match[2]) urls.push(match[2]);
  }
  return urls;
}

function collectBackgroundImageUrls() {
  const urls = new Set();
  // scan all elements and inspect computed style backgroundImage
  const all = document.querySelectorAll('*');
  all.forEach(el => {
    try {
      const style = window.getComputedStyle(el);
      const bg = style.getPropertyValue('background-image');
      extractUrlsFromStyle(bg).forEach(u => urls.add(u));
    } catch (e) {
      // ignore cross-origin computed style errors (rare)
    }
  });
  return Array.from(urls);
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ url, ok: true });
    img.onerror = () => resolve({ url, ok: false });
    // handle already data urls or cache quickly
    img.src = url;
    // if already cached, onload may not fire synchronously; that's fine
  });
}

function preloadAudio(el) {
  return new Promise((resolve) => {
    if (!el) return resolve({ el, ok: false });
    // If audio already ready (networkState), treat accordingly
    if (el.readyState >= 4) { // HAVE_ENOUGH_DATA / canplaythrough in many browsers
      return resolve({ el, ok: true });
    }
    // prefer canplaythrough, fallback to loadeddata or loadedmetadata
    const onCanPlay = () => cleanup(true);
    const onLoaded = () => cleanup(true);
    const onError = () => cleanup(false);

    function cleanup(ok) {
      el.removeEventListener('canplaythrough', onCanPlay);
      el.removeEventListener('loadeddata', onLoaded);
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('error', onError);
      resolve({ el, ok });
    }

    el.addEventListener('canplaythrough', onCanPlay, { once: true });
    el.addEventListener('loadeddata', onLoaded, { once: true });
    el.addEventListener('loadedmetadata', onLoaded, { once: true });
    el.addEventListener('error', onError, { once: true });

    // In some browsers a small play/pause can help trigger loading events; try a muted play then pause.
    try {
      const wasMuted = el.muted;
      el.muted = true;
      const p = el.play();
      if (p && p.catch) p.catch(() => {}).then(() => {
        el.pause();
        el.muted = wasMuted;
      });
    } catch (e) {
      // ignore
    }
  });
}

function buildAssetList() {
  const assets = {
    imageUrls: [],
    audioEls: []
  };

  // 1) <img> tags with a src
  document.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src');
    if (src) assets.imageUrls.push(src);
  });

  // 2) CSS background images
  collectBackgroundImageUrls().forEach(url => {
    // Ignore data: urls? No, we'll attempt to preload them too (fast)
    if (url) assets.imageUrls.push(url);
  });

  // 3) audio elements present on the page (your SFX elements)
  document.querySelectorAll('audio[src]').forEach(audio => {
    assets.audioEls.push(audio);
  });

  // make unique
  assets.imageUrls = Array.from(new Set(assets.imageUrls));
  assets.audioEls = Array.from(new Set(assets.audioEls));

  return assets;
}

function startPreloader(options = {}) {
  const { timeoutMs = 18000, minDisplayMs = 500 } = options;
  if (!loaderEl || !percentEl || !homepageEl || !splashOverlay) {
    // missing elements — fallback to previous behavior (show homepage immediately)
    if (loaderEl) loaderEl.classList.add('hidden');
    if (homepageEl) homepageEl.classList.add('visible');
    document.body.style.overflow = 'auto';
    if (splashOverlay) splashOverlay.classList.remove('hidden');
    return Promise.resolve();
  }

  const { imageUrls, audioEls } = buildAssetList();
  const totalCount = imageUrls.length + audioEls.length;
  if (totalCount === 0) {
    // nothing to wait for
    loaderEl.classList.add('hidden');
    homepageEl.classList.add('visible');
    document.body.style.overflow = 'auto';
    splashOverlay.classList.remove('hidden');
    percentEl.textContent = '100%';
    return Promise.resolve();
  }

  let loadedCount = 0;
  let lastPercent = 0;

  function updatePercent() {
    const pct = Math.round((loadedCount / totalCount) * 100);
    // animate small jumps: ensure monotonic increase
    if (pct > lastPercent) {
      lastPercent = pct;
      percentEl.textContent = `${pct}%`;
    }
  }

  // preload everything and listen to results
  const promises = [];

  imageUrls.forEach(url => {
    const p = preloadImage(url).then(() => {
      loadedCount++;
      updatePercent();
    });
    promises.push(p);
  });

  audioEls.forEach(el => {
    const p = preloadAudio(el).then(() => {
      loadedCount++;
      updatePercent();
    });
    promises.push(p);
  });

  // safety: if some assets never resolve, we use a timeout to proceed
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve('timeout');
    }, timeoutMs);
  });

  // Also ensure the loader isn't removed too quickly — keep a minimum display time
  const minDisplayPromise = new Promise(res => setTimeout(res, minDisplayMs));

  // As the assets load, we will update the percent. But to make it feel smoother, if percent
  // gets stuck at e.g. 0 for a moment, we can gently increment a "visual" percent up to the real percent.
  // We'll just ensure percentEl always reflects the computed value, so that's sufficient.

  return Promise.race([ Promise.all(promises), timeoutPromise ])
    .then(() => {
      // ensure percent shows 100%
      percentEl.textContent = '100%';
      return minDisplayPromise;
    })
    .then(() => {
      // hide loader and show homepage (same behavior as your previous code)
      loaderEl.classList.add('hidden');
      homepageEl.classList.add('visible');
      document.body.style.overflow = 'auto';
      splashOverlay.classList.remove('hidden');
    })
    .catch(() => {
      // on error, still proceed
      loaderEl.classList.add('hidden');
      homepageEl.classList.add('visible');
      document.body.style.overflow = 'auto';
      splashOverlay.classList.remove('hidden');
    });
}

/* —————————————————————————————————
   Run preloader only on pages that have the loader (index.html)
   ————————————————————————————————— */
if (loaderEl && percentEl && homepageEl && splashOverlay && enterBtn) {
  // start actual preloader
  startPreloader({ timeoutMs: 18000, minDisplayMs: 500 }).then(() => {
    // preloader done -> nothing else here (splash overlay will show; enter button already wired below)
  });
}


/* —————————————————————————————————
   Loader -> splash ENTER behavior (unchanged)
   ————————————————————————————————— */
if (enterBtn) {
  enterBtn.addEventListener('click', () => {
    if (splashOverlay) splashOverlay.classList.add('hidden');
  });
}


/* —————————————————————————————————
   Dropdown menu: dynamic generation per page
   - home => About, Contact (contact.html), Download...
   - about => Return to Home, Contact, Download...
   - contact => Return to Home, About, Download...
   This will replace the inner HTML of the dropdown-menu element.
   ————————————————————————————————— */
function detectPageType() {
  const seg = window.location.pathname.split('/').pop();
  if (!seg || seg === 'index.html' || seg === 'index') return 'home';
  if (seg === 'about.html') return 'about';
  if (seg === 'contact.html') return 'contact';
  return 'home';
}

function buildDropdownMenu() {
  if (!menu) return;
  const page = detectPageType();

  // common download item
  const download = {
    text: 'View Full Portfolio (PDF)',
    href: 'assets/ananya-full-portfolio.pdf',
    target: '_blank'
  };

  let items = [];

  // NOTE: Contact on the home menu now always links to contact.html (no #contact anchor)
  if (page === 'home') {
    items = [
      { text: 'About', href: 'about.html' },
      { text: 'Contact', href: 'contact.html' }, // <- changed to contact.html
      download
    ];
  } else if (page === 'about') {
    items = [
      { text: 'Return to Home', href: 'index.html' },
      { text: 'Contact', href: 'contact.html' },
      download
    ];
  } else if (page === 'contact') {
    items = [
      { text: 'Return to Home', href: 'index.html' },
      { text: 'About', href: 'about.html' },
      download
    ];
  } else {
    items = [
      { text: 'About', href: 'about.html' },
      { text: 'Contact', href: 'contact.html' },
      download
    ];
  }

  // create list items (li > a) to match your CSS expectation
  menu.innerHTML = items.map(item => {
    return `<li><a href="${item.href}"${item.target ? ' target="_blank"' : ''}>${item.text}</a></li>`;
  }).join('');

  // stopPropagation for clicks inside the menu (prevents immediate close)
  menu.addEventListener('click', e => e.stopPropagation());

  // for any anchor in the menu, ensure menu closes on click (good UX)
  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      menu.classList.remove('visible');
    });
  });
}

// build on load
buildDropdownMenu();


/* —————————————————————————————————
   Hamburger open/close behavior (works across pages)
   ————————————————————————————————— */
if (hamburger && menu) {
  // If we're not on the homepage, force hamburger visible (so about/contact pages show it)
  const page = detectPageType();
  if (page !== 'home') {
    // apply inline styles so CSS defaults don't hide it
    hamburger.style.opacity = '1';
    hamburger.style.pointerEvents = 'auto';
  }

  hamburger.addEventListener('click', e => {
    e.stopPropagation();
    menu.classList.toggle('visible');
  });

  // clicking anywhere else closes menu
  document.addEventListener('click', () => menu.classList.remove('visible'));

  // accessibility: close with Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') menu.classList.remove('visible');
  });
}


/* —————————————————————————————————
   Blob audio & overlays
   Guard all homepage-specific logic so it won't throw errors on about/contact pages
   ————————————————————————————————— */
const blobs = {
  red: {
    blob:    '.redblob',
    audio:   sfxRed,
    overlay: '.tarot-overlay',
    ph:      'assets/images/tarotph.png',
    ds:      'assets/images/tarotdsk.png'
  },
  blue: {
    blob:    '.blueblob',
    audio:   sfxBlue,
    overlay: '.comwork-overlay',
    ph:      'assets/images/comworkph.png',
    ds:      'assets/images/comworkdsk.png'
  },
  teal: {
    blob:    '.tealblob',
    audio:   sfxTeal,
    overlay: '.weard-overlay',
    ph:      'assets/images/wearph.png',
    ds:      'assets/images/weardsk.png'
  },
  pink: {
    blob:    '.pinkblob',
    audio:   sfxPink,
    overlay: '.web-overlay',
    ph:      'assets/images/webph.png',
    ds:      'assets/images/webdsk.png'
  },
  lime: {
    blob:    '.limeblob',
    audio:   sfxLime,
    overlay: '.client-overlay',
    ph:      'assets/images/clientph.png',
    ds:      'assets/images/clientdsk.png'
  },
  purple: {
    blob:    '.purpleblob',
    audio:   sfxPurple,
    overlay: '.photvid-overlay',
    ph:      'assets/images/photvidph.png',
    ds:      'assets/images/photviddsk.png'
  }
};

// collect blob DOM elements that actually exist on the page
const allBlobEls = Object.values(blobs)
  .map(o => document.querySelector(o.blob))
  .filter(Boolean);

const origZ = {};
const overlayZ = {};
const aboveZ = {};

// capture z-indices and overlay elements (guarded)
if (allBlobEls.length > 0) {
  allBlobEls.forEach(el => {
    origZ[el.className] = parseInt(getComputedStyle(el).zIndex, 10) || 0;
  });

  Object.values(blobs).forEach(o => {
    const ov = document.querySelector(o.overlay);
    if (!ov) return;
    overlayZ[o.overlay] = parseInt(getComputedStyle(ov).zIndex, 10) || 0;
    aboveZ[o.overlay] = overlayZ[o.overlay] + 1;
  });
}

// helper: lock other blobs while overlay is open
function lockOthers(activeBlob) {
  allBlobEls.forEach(b => {
    if (b !== activeBlob) b.style.pointerEvents = 'none';
  });
}

// show overlay (safe: only runs when elements exist)
function showOverlay(overlayEl, blobEl, phoneSrc, deskSrc, origIndex, aboveIndex) {
  if (!overlayEl || !blobEl) return;
  blobEl.style.zIndex = aboveIndex;
  lockOthers(blobEl);
  overlayEl.onload = () => requestAnimationFrame(() => overlayEl.classList.add('visible'));
  overlayEl.src = (window.innerWidth <= 1024 ? phoneSrc : deskSrc);
}

// hide overlay
function hideOverlay(overlayEl, blobEl, origIndex) {
  if (!overlayEl || !blobEl) return;
  // fade out blob visually while overlay closes
  blobEl.style.opacity = '0';
  overlayEl.classList.remove('visible');

  // when overlay transition completes, restore blob
  const handler = function (e) {
    if (e.propertyName === 'opacity') {
      blobEl.style.zIndex = origIndex;
      blobEl.style.opacity = '1';
      allBlobEls.forEach(b => b.style.pointerEvents = 'auto');
      overlayEl.removeEventListener('transitionend', handler);
    }
  };
  overlayEl.addEventListener('transitionend', handler);
}

// wire each blob only if the DOM element exists for it
Object.values(blobs).forEach(({ blob, audio, overlay, ph, ds }) => {
  const bEl = document.querySelector(blob);
  const oEl = document.querySelector(overlay);
  if (!bEl || !oEl) return;

  // hover sound
  bEl.addEventListener('mouseenter', () => {
    if (!audioUnlocked || !audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  });

  // click toggles overlay
  bEl.addEventListener('click', e => {
    e.stopPropagation();
    if (oEl.classList.contains('visible')) {
      hideOverlay(oEl, bEl, origZ[bEl.className]);
    } else {
      showOverlay(oEl, bEl, ph, ds, origZ[bEl.className], aboveZ[overlay]);
    }
  });
});

// close overlays on outside click (if any overlays exist)
document.addEventListener('click', () => {
  Object.values(blobs).forEach(({ overlay, blob }) => {
    const oEl = document.querySelector(overlay);
    const bEl = document.querySelector(blob);
    if (oEl && oEl.classList.contains('visible')) {
      hideOverlay(oEl, bEl, origZ[bEl.className]);
    }
  });
});

// prevent overlay clicks from closing
Object.values(blobs).forEach(({ overlay }) => {
  const o = document.querySelector(overlay);
  if (!o) return;
  o.addEventListener('click', e => e.stopPropagation());
});
