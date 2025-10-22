/* script.js — FULL replacement
   Includes:
     - preloader (images + audio) + message images preloaded
     - audio unlock
     - dropdown menu generation
     - blobs overlay logic + single message shown on first blob click
     - PDF password modal & session unlock (opens PDF in new tab)
*/

/* =========================
   CONFIG / EASY CHANGES
   ========================= */
/* Change this to update the PDF password */
const PDF_PASSWORD = 'P0rtf0li0$'; // ← change password here

/* Path to the PDF file (same as menu href) */
const PORTFOLIO_PDF = 'assets/ananya-full-portfolio.pdf';

/* =========================
   Audio elements & unlock
   ========================= */
const sfxRed    = document.getElementById('sfx-red');
const sfxBlue   = document.getElementById('sfx-blue');
const sfxTeal   = document.getElementById('sfx-teal');
const sfxPink   = document.getElementById('sfx-pink');
const sfxLime   = document.getElementById('sfx-lime');
const sfxPurple = document.getElementById('sfx-purple');

let audioUnlocked = false;
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

// unlock on first user click (some mobile browsers require user gesture)
document.addEventListener('click', () => {
  if (!audioUnlocked) unlockAudio();
}, { once: true });

/* =========================
   Useful DOM refs
   ========================= */
const loaderEl      = document.querySelector('.loader');
const percentEl     = document.querySelector('.loading-percentage');
const homepageEl    = document.querySelector('.homepage');
const splashOverlay = document.querySelector('.splash-overlay');
const enterBtn      = document.getElementById('enter-btn');

const hamburger     = document.querySelector('.hamburger');
const menu          = document.querySelector('.dropdown-menu');

/* =========================
   Message images: ensure these get preloaded
   ========================= */
const MESSAGE_PH = 'assets/images/messageph.png';
const MESSAGE_DS = 'assets/images/messagedsk.png';

/* =========================
   Blobs mapping (unchanged)
   ========================= */
const blobs = {
  red: {
    blob:    '.redblob',
    audio:   sfxRed,
    overlay: '.tarot-overlay',
    ph:      'assets/images/tarotph.png',
    ds:      'assets/images/tarotdsk.png',
    link:    'https://ananyaonline.art/tarot.html'
  },
  blue: {
    blob:    '.blueblob',
    audio:   sfxBlue,
    overlay: '.comwork-overlay',
    ph:      'assets/images/comworkph.png',
    ds:      'assets/images/comworkdsk.png',
    link:    'https://antidisciplinary.club/'
  },
  teal: {
    blob:    '.tealblob',
    audio:   sfxTeal,
    overlay: '.weard-overlay',
    ph:      'assets/images/wearph.png',
    ds:      'assets/images/weardsk.png',
    link:    'https://ananyaonline.art/wearart.html'
  },
  pink: {
    blob:    '.pinkblob',
    audio:   sfxPink,
    overlay: '.web-overlay',
    ph:      'assets/images/webph.png',
    ds:      'assets/images/webdsk.png',
    link:    'https://ananyaonline.art/web.html'
  },
  lime: {
    blob:    '.limeblob',
    audio:   sfxLime,
    overlay: '.client-overlay',
    ph:      'assets/images/clientph.png',
    ds:      'assets/images/clientdsk.png',
    link:    'https://ananyaonline.art/client.html'
  },
  purple: {
    blob:    '.purpleblob',
    audio:   sfxPurple,
    overlay: '.photvid-overlay',
    ph:      'assets/images/photvidph.png',
    ds:      'assets/images/photviddsk.png',
    link:    'https://ananyaonline.art/photvid.html'
  }
};

/* =========================
   Helpers: extract url(...) values from CSS
   ========================= */
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

/* =========================
   Collect background images (computed + stylesheets)
   ========================= */
function collectBackgroundImageUrls() {
  const urls = new Set();
  document.querySelectorAll('*').forEach(el => {
    try {
      const style = window.getComputedStyle(el);
      const bg = style.getPropertyValue('background-image');
      extractUrlsFromStyle(bg).forEach(u => urls.add(u));
    } catch (e) {}
  });

  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (!rules) continue;
      for (let r = 0; r < rules.length; r++) {
        const rule = rules[r];
        if (rule && rule.style) {
          const bg = rule.style.getPropertyValue('background-image');
          if (bg) extractUrlsFromStyle(bg).forEach(u => urls.add(u));
          const b0 = rule.style.getPropertyValue('background');
          if (b0) extractUrlsFromStyle(b0).forEach(u => urls.add(u));
        }
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
      continue;
    }
  }
  return Array.from(urls);
}

/* =========================
   Preload helpers for images & audio
   ========================= */
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

    setTimeout(() => tidy(el.readyState >= 2), Math.min(maxWaitMs, 15000));

    try {
      const wasMuted = el.muted;
      el.muted = true;
      const p = el.play();
      if (p && p.catch) p.catch(() => {}).then(() => {
        el.pause();
        el.muted = wasMuted;
      });
    } catch (e) {}
  });
}

/* =========================
   Build list of assets to preload
   ========================= */
function buildAssetList() {
  const assets = { imageUrls: [], audioEls: [] };

  // <img src>
  document.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src');
    if (src) assets.imageUrls.push(src);
  });

  // background images
  collectBackgroundImageUrls().forEach(url => {
    if (url) assets.imageUrls.push(url);
  });

  // blob overlay images
  Object.values(blobs).forEach(b => {
    if (b.ph) assets.imageUrls.push(b.ph);
    if (b.ds) assets.imageUrls.push(b.ds);
  });

  // message images (important!)
  assets.imageUrls.push(MESSAGE_PH);
  assets.imageUrls.push(MESSAGE_DS);

  // audio elements
  document.querySelectorAll('audio[src]').forEach(a => assets.audioEls.push(a));

  // dedupe & filter
  assets.imageUrls = Array.from(new Set(assets.imageUrls)).filter(Boolean);
  assets.audioEls = Array.from(new Set(assets.audioEls)).filter(Boolean);

  return assets;
}

/* =========================
   Preloader: smooth percent updates
   ========================= */
function startPreloader(options = {}) {
  const { timeoutMs = 25000, minDisplayMs = 800 } = options;
  if (!loaderEl || !percentEl || !homepageEl || !splashOverlay || !enterBtn) {
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
    preloadImage(url).then(() => { loadedCount++; setPercentByCount(); })
  );

  const audioPromises = audioEls.map(el =>
    preloadAudio(el).then(() => { loadedCount++; setPercentByCount(); })
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

/* Run preloader */
if (loaderEl && percentEl && homepageEl && splashOverlay && enterBtn) {
  startPreloader({ timeoutMs: 25000, minDisplayMs: 800 }).then(() => {});
}

/* =========================
   ENTER button behavior
   ========================= */
if (enterBtn) {
  enterBtn.addEventListener('click', () => {
    if (splashOverlay) splashOverlay.classList.add('hidden');
  });
}

/* =========================
   Dropdown menu generation — now sets an id on the PDF link
   ========================= */
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
    href: PORTFOLIO_PDF,
    target: '_blank',
    id: 'pdf-download-link' // we add an id so JS can intercept
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
    // add id attribute only for the download item
    const idAttr = item.id ? ` id="${item.id}"` : '';
    const targetAttr = item.target ? ' target="_blank"' : '';
    return `<li><a href="${item.href}"${targetAttr}${idAttr}>${item.text}</a></li>`;
  }).join('');

  menu.addEventListener('click', e => e.stopPropagation());

  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      menu.classList.remove('visible');
    });
  });
}
buildDropdownMenu();

/* =========================
   Hamburger open/close behavior
   ========================= */
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

/* =========================
   PDF password modal logic
   ========================= */
/* DOM refs for modal */
const pdfModal = document.getElementById('pdfPasswordModal');
const pdfBackdrop = document.getElementById('pdfModalBackdrop');
const pdfInput = document.getElementById('pdfPasswordInput');
const pdfSubmitBtn = document.getElementById('pdfSubmitBtn');
const pdfCancelBtn = document.getElementById('pdfCancelBtn');
const pdfError = document.getElementById('pdfModalError');

function isPdfUnlockedInSession() {
  try { return sessionStorage.getItem('pdfUnlocked') === '1'; } catch (e) { return false; }
}

function setPdfUnlockedInSession() {
  try { sessionStorage.setItem('pdfUnlocked', '1'); } catch (e) {}
}

function showPdfModal() {
  if (!pdfModal) return;
  pdfError.textContent = '';
  pdfInput.value = '';
  pdfModal.classList.remove('hidden');
  // focus input for quick entry
  setTimeout(() => pdfInput.focus(), 40);

  // trap keyboard: ESC to close handled below globally
  document.addEventListener('keydown', pdfKeyHandler);
}

function hidePdfModal() {
  if (!pdfModal) return;
  pdfModal.classList.add('hidden');
  pdfError.textContent = '';
  document.removeEventListener('keydown', pdfKeyHandler);
}

function pdfKeyHandler(e) {
  if (e.key === 'Escape') {
    hidePdfModal();
  } else if (e.key === 'Enter') {
    attemptPdfUnlock();
  }
}

function attemptPdfUnlock() {
  const val = (pdfInput && pdfInput.value) ? pdfInput.value.trim() : '';
  if (!val) {
    pdfError.textContent = 'Please enter a password.';
    return;
  }
  if (val === PDF_PASSWORD) {
    // success
    setPdfUnlockedInSession();
    hidePdfModal();
    // open PDF in new tab
    window.open(PORTFOLIO_PDF, '_blank');
  } else {
    pdfError.textContent = 'Incorrect password — try again.';
    // small shake animation optional (not required) — we'll just focus input
    pdfInput.focus();
    pdfInput.select();
  }
}

/* hook up buttons + clicks */
if (pdfSubmitBtn) pdfSubmitBtn.addEventListener('click', attemptPdfUnlock);
if (pdfCancelBtn) pdfCancelBtn.addEventListener('click', hidePdfModal);

/* clicking the backdrop or outside modal should close */
if (pdfBackdrop) pdfBackdrop.addEventListener('click', hidePdfModal);

/* Intercept the "View Full Portfolio (PDF)" link via its id (set in buildDropdownMenu) */
function attachPdfLinkInterceptor() {
  const pdfLink = document.getElementById('pdf-download-link');
  if (!pdfLink) return;

  // If PDF was already unlocked this session, let the link work normally
  if (isPdfUnlockedInSession()) {
    // ensure it opens in new tab; leave it be
    pdfLink.addEventListener('click', () => {
      // nothing — default behavior will open the PDF in new tab
    });
    return;
  }

  // otherwise intercept clicks to show modal
  pdfLink.addEventListener('click', function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    // show modal
    showPdfModal();
  });
}

// call after the menu exists
attachPdfLinkInterceptor();

/* =========================
   Blobs overlay & message logic (as before)
   ========================= */

// collect blob DOM elements that actually exist on the page
const allBlobEls = Object.values(blobs)
  .map(o => document.querySelector(o.blob))
  .filter(Boolean);

const origZ = {};
const overlayZ = {};
const aboveZ = {};

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

function lockOthers(activeBlob) {
  allBlobEls.forEach(b => {
    if (b !== activeBlob) b.style.pointerEvents = 'none';
  });
}

// track if message shown once
let messageShownOnce = false;
let activeMessageEl = null;
const overlayClickHandlers = new Map();

function showOverlay(overlayEl, blobEl, phoneSrc, deskSrc, origIndex, aboveIndex, link) {
  if (!overlayEl || !blobEl) return;
  blobEl.style.zIndex = aboveIndex;
  lockOthers(blobEl);

  const chosen = (window.innerWidth <= 1024 ? phoneSrc : deskSrc) || phoneSrc || deskSrc || '';
  overlayEl.onload = () => requestAnimationFrame(() => overlayEl.classList.add('visible'));
  overlayEl.src = chosen;

  overlayEl.style.cursor = 'pointer';

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

  if (!messageShownOnce) {
    messageShownOnce = true;
    const messageSrc = (window.innerWidth <= 1024 ? MESSAGE_PH : MESSAGE_DS);

    const wrapper = document.createElement('div');
    wrapper.className = 'overlay-message';
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-modal', 'true');

    const msgImg = document.createElement('img');
    msgImg.className = 'overlay-message-img';
    msgImg.src = messageSrc;
    msgImg.alt = 'Message';

    const okBtn = document.createElement('button');
    okBtn.className = 'overlay-message-ok';
    okBtn.textContent = 'OK';

    wrapper.appendChild(msgImg);
    wrapper.appendChild(okBtn);

    document.body.appendChild(wrapper);
    activeMessageEl = wrapper;

    const msgClick = (ev) => {
      ev.stopPropagation();
      if (link) window.open(link, '_blank');
    };
    wrapper.addEventListener('click', msgClick);

    const okHandler = (ev) => {
      ev.stopPropagation();
      wrapper.classList.add('hidden');
      const tidy = () => {
        wrapper.removeEventListener('transitionend', tidy);
        try { if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper); } catch (e) {}
        activeMessageEl = null;
      };
      wrapper.addEventListener('transitionend', tidy);
      setTimeout(() => {
        if (wrapper && wrapper.parentNode) {
          try { wrapper.parentNode.removeChild(wrapper); } catch (e) {}
          activeMessageEl = null;
        }
      }, 800);
    };
    okBtn.addEventListener('click', okHandler);
  }
}

function hideOverlay(overlayEl, blobEl, origIndex) {
  if (!overlayEl || !blobEl) return;
  blobEl.style.opacity = '0';
  overlayEl.classList.remove('visible');

  const handler = function (e) {
    if (e.propertyName === 'opacity' || e.propertyName === 'visibility') {
      blobEl.style.zIndex = origIndex;
      blobEl.style.opacity = '1';
      allBlobEls.forEach(b => b.style.pointerEvents = 'auto');
      overlayEl.removeEventListener('transitionend', handler);
    }
  };
  overlayEl.addEventListener('transitionend', handler);

  if (overlayClickHandlers.has(overlayEl)) {
    overlayEl.removeEventListener('click', overlayClickHandlers.get(overlayEl));
    overlayClickHandlers.delete(overlayEl);
  }

  if (activeMessageEl) {
    try { if (activeMessageEl.parentNode) activeMessageEl.parentNode.removeChild(activeMessageEl); } catch (e) {}
    activeMessageEl = null;
  }
}

Object.entries(blobs).forEach(([key, { blob, audio, overlay, ph, ds, link }]) => {
  const bEl = document.querySelector(blob);
  const oEl = document.querySelector(overlay);
  if (!bEl || !oEl) return;

  bEl.addEventListener('mouseenter', () => {
    if (!audioUnlocked || !audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  });

  bEl.addEventListener('click', e => {
    e.stopPropagation();
    if (oEl.classList.contains('visible')) {
      hideOverlay(oEl, bEl, origZ[bEl.className]);
    } else {
      showOverlay(oEl, bEl, ph, ds, origZ[bEl.className], aboveZ[overlay], link);
    }
  });
});

// outside click closes any overlays
document.addEventListener('click', () => {
  Object.values(blobs).forEach(({ overlay, blob }) => {
    const oEl = document.querySelector(overlay);
    const bEl = document.querySelector(blob);
    if (oEl && oEl.classList.contains('visible')) {
      hideOverlay(oEl, bEl, origZ[bEl.className]);
    }
  });
});

// prevent overlay clicks from closing page-level listener
Object.values(blobs).forEach(({ overlay }) => {
  const o = document.querySelector(overlay);
  if (!o) return;
  o.addEventListener('click', e => e.stopPropagation());
});

/* =========================
   After DOM changes (menu built) re-attach PDF interceptor
   If your site uses navigation that rebuilds the menu, call attachPdfLinkInterceptor again.
   ========================= */
attachPdfLinkInterceptor();
