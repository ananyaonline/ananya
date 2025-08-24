// script.js (full — replace your existing file with this)

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
   Loader -> homepage -> splash
   Only run this on pages that have these elements (index.html)
   ————————————————————————————————— */
if (loaderEl && percentEl && homepageEl && splashOverlay && enterBtn) {
  let pct = 0;
  const tick = setInterval(() => {
    pct += Math.floor(Math.random() * 5) + 1;
    if (pct > 100) pct = 100;
    percentEl.textContent = `${pct}%`;

    if (pct === 100) {
      clearInterval(tick);
      loaderEl.classList.add('hidden');
      homepageEl.classList.add('visible');
      // allow page to scroll after loader
      document.body.style.overflow = 'auto';
      // show the splash overlay (ENTER)
      splashOverlay.classList.remove('hidden');
    }
  }, 50);

  enterBtn.addEventListener('click', () => {
    splashOverlay.classList.add('hidden');
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
