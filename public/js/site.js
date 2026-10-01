'use strict';

const DATA = JSON.parse(document.getElementById('site-data').textContent);

/* ==================== LETTER HELPERS ==================== */
const TW_CHAR_DELAY = 42;
const TW_PARA_PAUSE = 800;
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

const RTL_CHAR_RE = /[֐-׿؀-ۿ܀-ݏݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
function isRTLText(t) { return RTL_CHAR_RE.test(t || ''); }
function applyDir(el, t) { if (el) el.setAttribute('dir', isRTLText(t) ? 'rtl' : 'ltr'); }
function segmentText(t) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try { return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t), (s) => s.segment); } catch (e) {}
  }
  return Array.from(t);
}

async function typewriteSimple(elId, text, speed) {
  const el = document.getElementById(elId);
  if (!el || !text) return;
  applyDir(el, text);
  el.textContent = '';
  for (const u of segmentText(text)) { el.textContent += u; await delay(speed); }
}

async function typewriteLetter(cfg) {
  if (cfg.title)      { await typewriteSimple('letter-title', cfg.title, 80);      await delay(600); }
  if (cfg.date)       { await typewriteSimple('letter-date', cfg.date, 50);        await delay(300); }
  if (cfg.salutation) { await typewriteSimple('letter-to', cfg.salutation, 80);    await delay(800); }
  const bodyEl = document.getElementById('letter-body');
  if (bodyEl) {
    const raw = (cfg.body || '').trim();
    applyDir(bodyEl, raw);
    const paragraphs = raw.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    for (let pi = 0; pi < paragraphs.length; pi++) {
      const p = document.createElement('p');
      p.dir = isRTLText(paragraphs[pi]) ? 'rtl' : 'ltr';
      p.style.opacity = '0';
      bodyEl.appendChild(p);
      const textNode = document.createTextNode('');
      p.appendChild(textNode);
      const cursor = document.createElement('span');
      cursor.className = 'typewriter-cursor';
      cursor.setAttribute('aria-hidden', 'true');
      p.appendChild(cursor);
      await delay(150);
      p.style.transition = 'opacity 0.4s';
      p.style.opacity = '1';
      for (const u of segmentText(paragraphs[pi])) {
        textNode.nodeValue += u;
        if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 120)) cursor.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        const isPunct = '.،!?؟،,'.includes(u);
        await delay(isPunct ? TW_CHAR_DELAY * 4 : TW_CHAR_DELAY + (Math.random() * 12 - 6));
      }
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      await delay(TW_PARA_PAUSE);
    }
  }
  if (cfg.from) { await delay(800); await typewriteSimple('letter-from', cfg.from, 110); }
}

/* ==================== FLOWER TRANSITION ==================== */
const FLOWER_IMAGES = ['/img/flower-1.svg', '/img/flower-2.svg'];

function playFlowerTransition() {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;overflow:hidden';
    document.body.appendChild(container);
    const slotSize = 65, cols = Math.ceil(window.innerWidth / slotSize) + 2, rows = Math.ceil(window.innerHeight / slotSize) + 2;
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2, maxDist = Math.sqrt(cx * cx + cy * cy);
    const flowers = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = (c - 0.5) * slotSize + (Math.random() - 0.5) * slotSize * 0.7, y = (r - 0.5) * slotSize + (Math.random() - 0.5) * slotSize * 0.7;
      const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
      flowers.push({ x, y, delay: (dist / maxDist) * 1100 + Math.random() * 180, rippleDelay: (dist / maxDist) * 1100 });
    }
    let bloomed = 0;
    const total = flowers.length;
    flowers.forEach((f, i) => {
      const el = document.createElement('div');
      f.el = el;
      const src = FLOWER_IMAGES[i % FLOWER_IMAGES.length], size = 55 + Math.random() * 75, rotation = Math.random() * 360;
      f.finalRotation = rotation + (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 180);
      f.finalScale = 1.0 + Math.random() * 1.6;
      el.style.cssText = `position:absolute;left:${f.x}px;top:${f.y}px;width:${size}px;height:${size}px;transform:translate(-50%,-50%) rotate(${rotation}deg) scale(0);opacity:0;will-change:transform,opacity;transition:transform 1.2s cubic-bezier(0.25,1,0.5,1),opacity 0.7s ease-in-out;`;
      el.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:contain;display:block;" alt="">`;
      container.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = `translate(-50%,-50%) rotate(${f.finalRotation}deg) scale(${f.finalScale})`;
        if (++bloomed === total) {
          resolve();
          setTimeout(() => {
            let maxFall = 0;
            flowers.forEach((flower) => {
              const fd = flower.rippleDelay + Math.random() * 80;
              if (fd > maxFall) maxFall = fd;
              setTimeout(() => {
                const dur = 1.8 + Math.random() * 0.8;
                flower.el.style.transition = `transform ${dur}s ease-in,opacity ${dur - 0.4}s ease-in-out`;
                flower.el.style.opacity = '0';
                flower.el.style.transform = `translate(-50%,calc(-50% + ${90 + Math.random() * 130}px)) rotate(${flower.finalRotation + (Math.random() > 0.5 ? 1 : -1) * (18 + Math.random() * 28)}deg) scale(${flower.finalScale})`;
              }, fd);
            });
            setTimeout(() => container.remove(), maxFall + 1100);
          }, 550);
        }
      }, f.delay);
    });
  });
}

/* ==================== PAGE NAVIGATION ==================== */
function showPage(id) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0 });
}

function goToJourney() {
  showPage('page-journey');
  startFloats();
}

function goToMessage() {
  showPage('page-message');
  setTimeout(() => {
    document.querySelectorAll('#page-message .message').forEach((m, i) => {
      m.classList.remove('show');
      setTimeout(() => m.classList.add('show'), i * 800);
    });
  }, 100);
}

function backToMemories() {
  showPage('page-journey');
}

/* ==================== FLOATING HEARTS ==================== */
const heartIcons = DATA.floatingHearts?.length ? DATA.floatingHearts : ['🤎'];
let floatInterval = null;
function startFloats() {
  if (floatInterval) return;
  floatInterval = setInterval(() => {
    for (let i = 0; i < 3; i++) {
      const el = document.createElement('div');
      el.className = 'float-item';
      el.textContent = heartIcons[Math.floor(Math.random() * heartIcons.length)];
      el.style.left = Math.random() * 100 + '%';
      el.style.fontSize = (Math.random() * 14 + 26) + 'px';
      el.style.animationDuration = (Math.random() * 5 + 8) + 's';
      el.style.animationDelay = (Math.random() * 0.8) + 's';
      el.style.opacity = '0';
      document.getElementById('floatsContainer').appendChild(el);
      setTimeout(() => el.remove(), 15000);
    }
  }, 600);
}

/* ==================== COUNTDOWN ==================== */
const startDate = new Date(`${DATA.startDate}T00:00:00`).getTime();
function updateCountdown() {
  const d = Math.max(0, Date.now() - startDate);
  document.getElementById('days').textContent    = Math.floor(d / 86400000);
  document.getElementById('hours').textContent   = String(Math.floor((d % 86400000) / 3600000)).padStart(2, '0');
  document.getElementById('minutes').textContent = String(Math.floor((d % 3600000) / 60000)).padStart(2, '0');
  document.getElementById('seconds').textContent = String(Math.floor((d % 60000) / 1000)).padStart(2, '0');
}
updateCountdown();
setInterval(updateCountdown, 1000);

/* ==================== TAP CARD ==================== */
const hearts = DATA.tapHearts?.length ? DATA.tapHearts : ['🤎'];
function tapCard(e, card) {
  const rc = card.querySelector('.ripple-container');
  if (rc) {
    const r = document.createElement('div');
    r.className = 'ripple';
    const rect = rc.getBoundingClientRect(), size = Math.max(rect.width, rect.height) * 1.5;
    r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;`;
    rc.appendChild(r);
    setTimeout(() => r.remove(), 600);
  }
  const h = document.createElement('div');
  h.className = 'heart-burst';
  h.textContent = hearts[Math.floor(Math.random() * hearts.length)];
  const crect = card.getBoundingClientRect();
  h.style.left = (e.clientX - crect.left - 11) + 'px';
  h.style.top = (e.clientY - crect.top - 11) + 'px';
  card.appendChild(h);
  setTimeout(() => h.remove(), 750);
}

/* ==================== MUSIC PLAYER ==================== */
const songs = DATA.songs || [];
const audio = document.getElementById('loveSong');

if (audio && songs.length) {
  let curSong = 0;
  const playIcon = document.getElementById('playIcon'),
        disc = document.getElementById('disc'), soundWave = document.getElementById('soundWave'),
        fillEl = document.getElementById('progressFill'), curTEl = document.getElementById('currentTime'),
        totTEl = document.getElementById('totalTime');

  const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  function setPlaying(on) {
    playIcon.className = on ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    soundWave.classList.toggle('playing', on);
    disc.classList.toggle('spinning', on);
  }

  function play() {
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  function loadSong(idx, autoplay) {
    curSong = (idx + songs.length) % songs.length;
    audio.src = songs[curSong].url;
    document.getElementById('songName').textContent = songs[curSong].name || `🎵 أغنية ${curSong + 1}`;
    document.getElementById('songNum').textContent = (curSong + 1) + ' / ' + songs.length;
    fillEl.style.width = '0%'; curTEl.textContent = '0:00'; totTEl.textContent = '0:00';
    if (autoplay) play(); else setPlaying(false);
  }

  document.getElementById('playBtn').addEventListener('click', () => {
    if (audio.paused) play();
    else { audio.pause(); setPlaying(false); }
  });
  document.getElementById('prevBtn').addEventListener('click', () => loadSong(curSong - 1, !audio.paused));
  document.getElementById('nextSongBtn').addEventListener('click', () => loadSong(curSong + 1, !audio.paused));
  document.getElementById('progressBar').addEventListener('click', (e) => {
    if (audio.duration) audio.currentTime = (e.offsetX / e.currentTarget.offsetWidth) * audio.duration;
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    fillEl.style.width = (audio.currentTime / audio.duration * 100) + '%';
    curTEl.textContent = fmt(audio.currentTime);
  });
  audio.addEventListener('loadedmetadata', () => { totTEl.textContent = fmt(audio.duration); });
  audio.addEventListener('ended', () => loadSong(curSong + 1, true));

  loadSong(0, false);

  // Browsers only allow sound after the visitor has interacted with the site.
  // Try right away (usually works after typing the password); otherwise start
  // on the first tap anywhere — except on the player, which handles itself.
  audio.play().then(() => setPlaying(true)).catch(() => {
    const startOnGesture = (e) => {
      if (e.target.closest('.music-player')) return;
      removeGestureListeners();
      if (audio.paused) play();
    };
    const events = ['pointerdown', 'keydown', 'touchstart'];
    const removeGestureListeners = () => events.forEach((ev) => document.removeEventListener(ev, startOnGesture, true));
    events.forEach((ev) => document.addEventListener(ev, startOnGesture, true));
    audio.addEventListener('play', removeGestureListeners, { once: true });
  });
}

/* ==================== EVENT LISTENERS ==================== */
document.getElementById('next-btn').addEventListener('click', goToJourney);
document.getElementById('toPage3Btn').addEventListener('click', goToMessage);
document.getElementById('backBtn').addEventListener('click', backToMemories);
document.getElementById('scrollHint').addEventListener('click', () => {
  document.getElementById('mainContent').scrollIntoView({ behavior: 'smooth' });
});

document.addEventListener('click', (e) => {
  const card = e.target.closest('.photo-card');
  if (card) tapCard(e, card);
});

/* ==================== INIT ==================== */
(async () => {
  await playFlowerTransition();
  const paper = document.getElementById('letter-paper');
  if (paper) requestAnimationFrame(() => requestAnimationFrame(() => paper.classList.add('is-revealing')));
  await delay(1350);
  await typewriteLetter(DATA.letter);
})();
