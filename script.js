/* script.js (FULL replacement)
   Same as your previous script, but the message overlay now shows
   only once total per page load (the first time the user opens any blob).
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
   Blobs mapping (kept identical — used elsewhere)
   Also: we will explicitly include the ph/ds urls in preloader
   ————————————————————————————————— */
const MESSAGE_PH = 'assets/images/messageph.png';
const MESSAGE_DS = 'assets/images/messagedsk.png';

const blobs = {
  red: {
    blob:    '.redblob',
    audio:   sfxRed,
    overlay: '.tarot-overlay',
    ph:      'assets/images/tarotph.png',
    ds:      'assets/images/tarotdsk.png',
    link:    'https://www.youtube.com' // default — change per-blob as you like
  },
  blue: {
    blob:    '.blueblob',
    audio:   sfxBlue,
    overlay: '.comwork-overlay',
    ph:      'assets/images/comworkph.png',
    ds:      'assets/images/comworkdsk.png',
    link:    'https://www.youtube.com'
  },
  teal: {
    blob:    '.tealblob',
    audio:   sfxTeal,
    overlay: '.weard-overlay',
    ph:      'assets/images/wearph.png',
    ds:      'assets/images/weardsk.png',
    link:    'https://www.youtube.com'
  },
  pink: {
    blob:    '.pinkblob',
    audio:   sfxPink,
    overlay: '.web-overlay',
    ph:      'assets/images/webph.png',
    ds:      'assets/images/webdsk.png',
    link:    'https://www.youtube.com'
  },
  lime: {
    blob:    '.limeblob',
    audio:   sfxLime,
    overlay: '.client-overlay',
    ph:      'assets/images/clientph.png',
    ds:      'assets/images/clientdsk.png',
    link:    'https://www.youtube.com'
  },
  purple: {
    blob:    '.purpleblob',
    audio:   sfxPurple,
    overlay: '.photvid-overlay',
    ph:      'assets/images/photvidph.png',
    ds:      'assets/images/photviddsk.png',
    link:    'https://www.youtube.com'
  }
};


/* —————————————————————————————————
   Helper: extract url(...) values from CSS text
   ————————————————————————————————— */
function extractUrlsFromStyle(styleValue) {
  const urls = [];
  if (!styleValue || styleValue === 'none') return urls;
  const regex = /url\((['"]?)(.*?)\1\)/g;
  let match;
  while ((match = regex.exec(styleValue)) !== null) {
    if (match[2]) urls.push(match[2]);
  }
  return urls;
}

/* —————————————————————————————————
   Collect background-image URLs from:
     1) computed styles of all elements (safe)
     2) raw CSSRules from document.styleSheets (may be blocked by CORS; we gracefully ignore)
   This ensures we pick up background images defined in external CSS files and inline.
   ————————————————————————————————— */
function collectBackgroundImageUrls() {
  const urls = new Set();

  // 1) computed styles (works even if element is hidden)
  document.querySelectorAll('*').forEach(el => {
    try {
      const style = window.getComputedStyle(el);
      const bg = style.getPropertyValue('background-image');
      extractUrlsFromStyle(bg).forEach(u => urls.add(u));
    } catch (e) {
      // ignore unusual computed style errors
    }
  });

  // 2) inspect styleSheets rules for background-image declarations (may throw for cross-origin)
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (!rules) continue;
      for (let r = 0; r < rules.length; r++) {
        const rule = rules[r];
        // some rules are style rules
        if (rule && rule.style) {
          const bg = rule.style.getPropertyValue('background-image');
          if (bg) extractUrlsFromStyle(bg).forEach(u => urls.add(u));
          // also check shorthand 'background'
          const b0 = rule.style.getPropertyValue('background');
          if (b0) extractUrlsFromStyle(b0).forEach(u => urls.add(u));
        }
        // nested rules (e.g., media queries) may have cssRules too
        if (rule && rule.cssRules) {
          for (let j = 0; j < rule.cssRules.length; j++) {
            const r2 = rule.cssRules[j];
            if (r2 && r2.style) {
              const bg2 = r2.style.getPropertyValue('background-image');
              if (bg2) extractUrlsFromStyle(bg2).forEach(u => urls.add(u));
              const b1 = r2.style.getPropertyValue('background');
              if (b1) extractUrlsFromStyle(b1).forEach(u => urls.add(u));
            }
          }
        }
      }
    } catch (e) {
      // cross-origin stylesheets will throw; ignore them
      continue;
    }
  }

  return Array.from(urls);
}

/* —————————————————————————————————
   Preload helpers for images and audio
   ————————————————————————————————— */
function preloadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve({ url, ok: false });
    try {
      const img = new Image();
      img.onload = () => resolve({ url, ok: true });
      img.onerror = () => resolve({ url, ok: false });
      img.src = url;
    } catch (e) {
      resolve({ url, ok: false });
    }
  });
}

function preloadAudio(el, maxWaitMs = 12000) {
  return new Promise((resolve) => {
    if (!el) return resolve({ el, ok: false });

    // If audio already ready, resolve immediately
    if (el.readyState >= 4) return resolve({ el, ok: true });

    let resolved = false;
    const tidy = (ok) => {
      if (resolved) return;
      resolved = true;
      el.removeEventListener('canplaythrough', cancb);
      el.removeEventListener('loadeddata', loadcb);
      el.removeEventListener('error', errcb);
      resolve({ el, ok });
    };

    const cancb = () => tidy(true);
    const loadcb = () => tidy(true);
    const errcb = () => tidy(false);

    el.addEventListener('canplaythrough', cancb, { once: true });
    el.addEventListener('loadeddata', loadcb, { once: true });
    el.addEventListener('error', errcb, { once: true });

    // safety fallback: if nothing triggers, resolve after maxWaitMs
    setTimeout(() => tidy(el.readyState >= 2), Math.min(maxWaitMs, 15000));

    // attempt a small muted play to nudge browsers to fetch audio data
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

/* —————————————————————————————————
   Build list of assets to preload:
     - all <img src> attributes
     - CSS background images (computed + stylesheet parsing)
     - overlay images referenced in blobs (ph and ds)
     - audio elements with src
   ————————————————————————————————— */
function buildAssetList() {
  const assets = {
    imageUrls: [],
    audioEls: []
  };

  // 1) <img src> tags
  document.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src');
    if (src) assets.imageUrls.push(src);
  });

  // 2) background images (computed + stylesheets)
  collectBackgroundImageUrls().forEach(url => {
    if (url) assets.imageUrls.push(url);
  });

  // 3) overlay images defined in blobs (they may not be present as src in DOM initially)
  Object.values(blobs).forEach(b => {
    if (b.ph) assets.imageUrls.push(b.ph);
    if (b.ds) assets.imageUrls.push(b.ds);
  });

  // 4) audio elements on the page
  document.querySelectorAll('audio[src]').forEach(a => assets.audioEls.push(a));

  // de-dupe
  assets.imageUrls = Array.from(new Set(assets.imageUrls));
  assets.audioEls = Array.from(new Set(assets.audioEls));

  return assets;
}

/* —————————————————————————————————
   Smooth progress updater
   We will update the visible percent whenever an asset resolves.
   ————————————————————————————————— */
function startPreloader(options = {}) {
  const { timeoutMs = 25000, minDisplayMs = 800 } = options;
  if (!loaderEl || !percentEl || !homepageEl || !splashOverlay || !enterBtn) {
    // missing page-specific elements -> show homepage immediately
    if (loaderEl) loaderEl.classList.add('hidden');
    if (homepageEl) homepageEl.classList.add('visible');
    document.body.style.overflow = 'auto';
    if (splashOverlay) splashOverlay.classList.remove('hidden');
    return Promise.resolve();
  }

  const { imageUrls, audioEls } = buildAssetList();
  const totalCount = imageUrls.length + audioEls.length;

  if (totalCount === 0) {
    percentEl.textContent = '100%';
    loaderEl.classList.add('hidden');
    homepageEl.classList.add('visible');
    document.body.style.overflow = 'auto';
    splashOverlay.classList.remove('hidden');
    return Promise.resolve();
  }

  let loadedCount = 0;
  let lastPercent = 0;

  function setPercentByCount() {
    const pct = Math.round((loadedCount / totalCount) * 100);
    if (pct > lastPercent) {
      lastPercent = pct;
      percentEl.textContent = `${pct}%`;
    } else {
      percentEl.textContent = `${lastPercent}%`;
    }
  }

  const imgPromises = imageUrls.map(url =>
    preloadImage(url).then(() => {
      loadedCount++;
      setPercentByCount();
    })
  );

  const audioPromises = audioEls.map(el =>
    preloadAudio(el).then(() => {
      loadedCount++;
      setPercentByCount();
    })
  );

  const allPromises = imgPromises.concat(audioPromises);

  let animInterval = null;
  animInterval = setInterval(() => {
    const actualPct = Math.round((loadedCount / totalCount) * 100);
    const visible = parseInt(percentEl.textContent.replace('%',''), 10) || 0;
    if (visible < actualPct) {
      percentEl.textContent = `${visible + 1}%`;
      lastPercent = visible + 1;
    } else {
      percentEl.textContent = `${actualPct}%`;
      lastPercent = actualPct;
    }
  }, 200);

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve('timeout'), timeoutMs);
  });

  return Promise.race([ Promise.all(allPromises), timeoutPromise ])
    .then(() => {
      if (animInterval) clearInterval(animInterval);
      percentEl.textContent = '100%';
      return new Promise(res => setTimeout(res, minDisplayMs));
    })
    .then(() => {
      loaderEl.classList.add('hidden');
      homepageEl.classList.add('visible');
      document.body.style.overflow = 'auto';
      splashOverlay.classList.remove('hidden');
    })
    .catch(() => {
      if (animInterval) clearInterval(animInterval);
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
  startPreloader({ timeoutMs: 25000, minDisplayMs: 800 }).then(() => {
    // nothing additional required here
  });
}

/* —————————————————————————————————
   ENTER button for splash (unchanged)
   ————————————————————————————————— */
if (enterBtn) {
  enterBtn.addEventListener('click', () => {
    if (splashOverlay) splashOverlay.classList.add('hidden');
  });
}

/* —————————————————————————————————
   Dropdown menu: dynamic generation per page
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

  const download = {
    text: 'View Full Portfolio (PDF)',
    href: 'assets/ananya-full-portfolio.pdf',
    target: '_blank'
  };

  let items = [];

  if (page === 'home') {
    items = [
      { text: 'About', href: 'about.html' },
      { text: 'Contact', href: 'contact.html' },
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

  menu.innerHTML = items.map(item => {
    return `<li><a href="${item.href}"${item.target ? ' target="_blank"' : ''}>${item.text}</a></li>`;
  }).join('');

  menu.addEventListener('click', e => e.stopPropagation());

  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      menu.classList.remove('visible');
    });
  });
}
buildDropdownMenu();

/* —————————————————————————————————
   Hamburger open/close behavior (same as before)
   ————————————————————————————————— */
if (hamburger && menu) {
  const page = detectPageType();
  if (page !== 'home') {
    hamburger.style.opacity = '1';
    hamburger.style.pointerEvents = 'auto';
  }

  hamburger.addEventListener('click', e => {
    e.stopPropagation();
    menu.classList.toggle('visible');
  });

  document.addEventListener('click', () => menu.classList.remove('visible'));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') menu.classList.remove('visible');
  });
}

/* —————————————————————————————————
   Blob audio & overlays (unchanged logic mostly)
   Added:
    - temporary message image shown only ONCE total (first blob interaction)
    - per-card clickable link (overlay click & message click open link)
   ————————————————————————————————— */

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

// TRACK: whether we've shown the message at least once this page load
let messageShownOnce = false;

// store the currently active message element (only one ever created per page load)
let activeMessageEl = null;
// store overlay click handlers so we can remove them cleanly
const overlayClickHandlers = new Map();

/* show overlay
   overlayEl: <img> element for card
   blobEl: the blob <img> that was clicked
   phoneSrc / deskSrc: overlay content images
   origIndex / aboveIndex: z-index bookkeeping
   link: url to open on click for this card
*/
function showOverlay(overlayEl, blobEl, phoneSrc, deskSrc, origIndex, aboveIndex, link) {
  if (!overlayEl || !blobEl) return;
  blobEl.style.zIndex = aboveIndex;
  lockOthers(blobEl);

  // choose src based on viewport width
  const chosen = (window.innerWidth <= 1024 ? phoneSrc : deskSrc) || phoneSrc || deskSrc || '';
  overlayEl.onload = () => requestAnimationFrame(() => overlayEl.classList.add('visible'));
  overlayEl.src = chosen;

  // make overlay clickable and open the provided link
  overlayEl.style.cursor = 'pointer';

  // remove existing click handler if present
  if (overlayClickHandlers.has(overlayEl)) {
    overlayEl.removeEventListener('click', overlayClickHandlers.get(overlayEl));
    overlayClickHandlers.delete(overlayEl);
  }
  const openHandler = (e) => {
    e.stopPropagation();
    if (link) window.open(link, '_blank');
  };
  overlayEl.addEventListener('click', openHandler);
  overlayClickHandlers.set(overlayEl, openHandler);

  // Show the MESSAGE only if we haven't shown any message yet this page load
  if (!messageShownOnce) {
    messageShownOnce = true;

    // create message element
    const messageSrc = (window.innerWidth <= 1024 ? MESSAGE_PH : MESSAGE_DS);
    const msg = document.createElement('img');
    msg.className = 'overlay-message';
    msg.src = messageSrc;

    // Add to DOM
    document.body.appendChild(msg);
    activeMessageEl = msg;

    // message is clickable: open same link
    msg.style.cursor = 'pointer';
    const msgClick = (ev) => {
      ev.stopPropagation();
      if (link) window.open(link, '_blank');
    };
    msg.addEventListener('click', msgClick);

    // auto-fade after 3s (gradual disappearance)
    setTimeout(() => {
      msg.classList.add('hidden');
      const tidy = () => {
        msg.removeEventListener('transitionend', tidy);
        try { if (msg.parentNode) msg.parentNode.removeChild(msg); } catch (e) {}
        activeMessageEl = null;
      };
      msg.addEventListener('transitionend', tidy);
      // safety remove in case transitionend doesn't fire
      setTimeout(() => {
        if (msg && msg.parentNode) {
          try { msg.parentNode.removeChild(msg); } catch (e) {}
          activeMessageEl = null;
        }
      }, 1000);
    }, 3000);
  }
}

// hide overlay
function hideOverlay(overlayEl, blobEl, origIndex) {
  if (!overlayEl || !blobEl) return;
  // fade out blob visually while overlay closes
  blobEl.style.opacity = '0';
  overlayEl.classList.remove('visible');

  // restore blob when overlay transition completes
  const handler = function (e) {
    if (e.propertyName === 'opacity' || e.propertyName === 'visibility') {
      blobEl.style.zIndex = origIndex;
      blobEl.style.opacity = '1';
      allBlobEls.forEach(b => b.style.pointerEvents = 'auto');
      overlayEl.removeEventListener('transitionend', handler);
    }
  };
  overlayEl.addEventListener('transitionend', handler);

  // remove overlay click handler if we added one
  if (overlayClickHandlers.has(overlayEl)) {
    overlayEl.removeEventListener('click', overlayClickHandlers.get(overlayEl));
    overlayClickHandlers.delete(overlayEl);
  }

  // If the active message element is still present, remove it immediately
  if (activeMessageEl) {
    try { if (activeMessageEl.parentNode) activeMessageEl.parentNode.removeChild(activeMessageEl); } catch (e) {}
    activeMessageEl = null;
  }
}

// wire each blob only if the DOM element exists for it
Object.entries(blobs).forEach(([key, { blob, audio, overlay, ph, ds, link }]) => {
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
      showOverlay(oEl, bEl, ph, ds, origZ[bEl.className], aboveZ[overlay], link);
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

// prevent overlay clicks from closing (keeps existing behavior)
Object.values(blobs).forEach(({ overlay }) => {
  const o = document.querySelector(overlay);
  if (!o) return;
  o.addEventListener('click', e => e.stopPropagation());
});
