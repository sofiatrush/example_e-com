/* ================================================================
   AURA — Mood Map
   Floating organic orbs · click-to-explore transition
================================================================ */

'use strict';

const MOODS = [
  {
    id:    'treat',
    label: 'Need a treat',
    emoji: '✨',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 60%, #fda085 100%)',
    glow:    'rgba(240,93,122,0.45)',
    size:    180,
    pos:     { left: '5%',  top: '8%' },
    mobileSize: 82,
    mobilePos:  { left: '3%', top: '3%' },
    float:   { dur: '7.2s', delay: '0s' },
  },
  {
    id:    'focus',
    label: "Can't focus",
    emoji: '🎯',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    glow:    'rgba(79,172,254,0.40)',
    size:    160,
    pos:     { right: '6%', top: '4%' },
    mobileSize: 76,
    mobilePos:  { right: '3%', top: '3%' },
    float:   { dur: '8.5s', delay: '1.2s' },
  },
  {
    id:    'slow-sunday',
    label: 'Slow Sunday',
    emoji: '☁️',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    glow:    'rgba(161,140,209,0.45)',
    size:    200,
    pos:     { left: '50%', top: '50%', transform: 'translate(-50%,-50%)' },
    mobileSize: 86,
    mobilePos:  { left: '50%', top: '42%', transform: 'translate(-50%,-50%)' },
    float:   { dur: '9.0s', delay: '0.5s' },
  },
  {
    id:    'nostalgic',
    label: 'Feeling nostalgic',
    emoji: '🌅',
    gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
    glow:    'rgba(247,151,30,0.40)',
    size:    170,
    pos:     { left: '8%', bottom: '6%' },
    mobileSize: 80,
    mobilePos:  { left: '3%', top: '42%' },
    float:   { dur: '7.8s', delay: '2.0s' },
  },
  {
    id:    'gift',
    label: 'Planning a gift',
    emoji: '🎁',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    glow:    'rgba(56,239,125,0.40)',
    size:    155,
    pos:     { right: '4%', bottom: '10%' },
    mobileSize: 80,
    mobilePos:  { right: '3%', top: '42%' },
    float:   { dur: '6.8s', delay: '1.7s' },
  },
  {
    id:    'fresh',
    label: 'Fresh start',
    emoji: '🌱',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    glow:    'rgba(118,75,162,0.40)',
    size:    162,
    pos:     { right: '28%', top: '12%' },
    mobileSize: 76,
    mobilePos:  { left: '50%', top: '3%', transform: 'translateX(-50%)' },
    float:   { dur: '8.2s', delay: '3.0s' },
  },
  {
    id:    'map',
    label: 'Find nearby store',
    emoji: '📍',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #e94560 100%)',
    glow:    'rgba(233,69,96,0.55)',
    size:    148,
    pos:     { left: '30%', bottom: '4%' },
    mobileSize: 72,
    mobilePos:  { left: '50%', bottom: '3%', transform: 'translateX(-50%)' },
    float:   { dur: '6.5s', delay: '0.8s' },
    action:  'store-map',
  },
];

let currentExpanding = null;

function buildOrb(mood) {
  const el = document.createElement('button');
  el.className           = 'mood-orb';
  el.dataset.moodId      = mood.id;
  el.setAttribute('role', 'listitem');
  el.setAttribute('aria-label', `Select mood: ${mood.label}`);

  const isMobile = window.innerWidth <= 768;
  const size = isMobile ? (mood.mobileSize || mood.size) : mood.size;
  const pos  = isMobile ? (mood.mobilePos  || mood.pos)  : mood.pos;

  // Size
  el.style.width  = `${size}px`;
  el.style.height = `${size}px`;

  // Position
  Object.entries(pos).forEach(([k, v]) => { el.style[k] = v; });

  // Visual
  el.style.background = mood.gradient;
  el.style.boxShadow  = `0 8px 40px ${mood.glow}, inset 0 1px 0 rgba(255,255,255,0.2)`;
  el.style.color      = 'rgba(255,255,255,0.95)';

  // Float animation custom props
  el.style.setProperty('--float-dur',   mood.float.dur);
  el.style.setProperty('--float-delay', mood.float.delay);

  el.innerHTML = `
    <span class="mood-orb__emoji">${mood.emoji}</span>
    <span class="mood-orb__label">${mood.label}</span>
    ${mood.action === 'store-map' ? '<span class="mood-orb__map-ring"></span>' : ''}
  `;

  if (mood.action === 'store-map') {
    el.classList.add('mood-orb--map');
    el.addEventListener('click', () => onMapOrbClick(mood, el));
  } else {
    el.addEventListener('click', () => onMoodSelect(mood, el));
  }
  el.addEventListener('mouseenter', () => onMoodHover(mood, el, true));
  el.addEventListener('mouseleave', () => onMoodHover(mood, el, false));

  return el;
}

function onMoodHover(mood, el, entering) {
  if (entering) {
    el.style.boxShadow = `0 16px 56px ${mood.glow}, 0 0 0 2px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.2)`;
  } else {
    el.style.boxShadow = `0 8px 40px ${mood.glow}, inset 0 1px 0 rgba(255,255,255,0.2)`;
  }
}

function onMoodSelect(mood, el) {
  if (currentExpanding) return;
  currentExpanding = el;

  // Animate orb to fill screen
  const rect = el.getBoundingClientRect();
  const cx   = rect.left + rect.width  / 2;
  const cy   = rect.top  + rect.height / 2;
  const maxD = Math.hypot(window.innerWidth, window.innerHeight) * 2.2;

  el.style.transition = 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
  el.style.position   = 'fixed';
  el.style.left       = `${cx}px`;
  el.style.top        = `${cy}px`;
  el.style.width      = `${maxD}px`;
  el.style.height     = `${maxD}px`;
  el.style.transform  = 'translate(-50%, -50%)';
  el.style.borderRadius = '50%';
  el.style.zIndex     = '800';
  el.style.opacity    = '0.7';

  setTimeout(() => {
    window.App?.navigateTo('explore', {
      mood:           mood.id,
      moodLabel:      mood.label,
      interpretation: getMoodInterpretation(mood.id),
    });
    // Reset the orb after transition
    setTimeout(() => {
      const isMob = window.innerWidth <= 768;
      const resetSize = isMob ? (mood.mobileSize || mood.size) : mood.size;
      const resetPos  = isMob ? (mood.mobilePos  || mood.pos)  : mood.pos;
      el.style.transition = '';
      el.style.position   = '';
      el.style.left       = '';
      el.style.top        = '';
      el.style.right      = '';
      el.style.bottom     = '';
      el.style.width      = `${resetSize}px`;
      el.style.height     = `${resetSize}px`;
      el.style.transform  = resetPos.transform || '';
      el.style.borderRadius = '';
      el.style.zIndex     = '';
      el.style.opacity    = '';
      Object.entries(resetPos).forEach(([k, v]) => { el.style[k] = v; });
      currentExpanding = null;
    }, 700);
  }, 500);
}

/* Map orb — pulses with glow, then opens store finder modal */
function onMapOrbClick(mood, el) {
  if (currentExpanding) return;

  // Pulse burst animation
  el.style.transition = 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s ease';
  el.style.transform  = 'scale(1.14)';
  el.style.boxShadow  = `0 0 70px ${mood.glow}, 0 0 140px ${mood.glow}`;

  setTimeout(() => {
    el.style.transform = '';
    el.style.boxShadow = `0 8px 40px ${mood.glow}, inset 0 1px 0 rgba(255,255,255,0.2)`;

    // Show AI thinking, then open modal
    window.App?.showAIThinking('Finding stores near you\u2026');
    setTimeout(() => {
      window.App?.hideAIThinking();
      const modal = document.getElementById('store-modal');
      if (modal) {
        modal.hidden = false;
        modal.removeAttribute('hidden');
        window.LocalAPI?.getStores?.().then(data => {
          // Use the app's renderStoreFinder if exposed, else build manually
          const pins = document.getElementById('store-map-pins');
          const list = document.getElementById('store-list');
          if (!pins || !list) return;
          const stores = data.stores;
          pins.innerHTML = stores.map(s => `
            <div class="store-pin ${s.open ? '' : 'closed'}" style="left:${s.x}%;top:${s.y}%;" title="${s.name}">
              <div class="store-pin__dot"></div>
              <div class="store-pin__label">${s.name}</div>
            </div>
          `).join('');
          list.innerHTML = stores.map(s => `
            <div class="store-card">
              <div class="store-card__info">
                <div class="store-card__name">${s.name}</div>
                <div class="store-card__address">${s.address}</div>
                <div class="store-card__hours">${s.hours}</div>
              </div>
              <div class="store-card__meta">
                <span class="store-card__distance">${s.distance}</span>
                <span class="store-badge ${s.open ? 'store-badge--open' : 'store-badge--closed'}">${s.open ? 'Open' : 'Closed'}</span>
                ${s.open ? `<button class="store-card__select-btn">Pick up here</button>` : ''}
              </div>
            </div>
          `).join('');
        }).catch(() => {});
      }
    }, 900);
  }, 300);
}

function getMoodInterpretation(moodId) {
  const map = {
    treat:         "I hear you — you deserve something special. Here's what I found.",
    focus:         "Let's create the perfect environment for deep focus.",
    'slow-sunday': "Taking it slow today? I've curated the perfect selection.",
    nostalgic:     "Let's bring back those warm feelings with these picks.",
    gift:          "Finding the perfect gift is easy when AI knows your taste.",
    fresh:         "Ready for something new? These will help you step forward.",
  };
  return map[moodId] || 'Here\'s what I found for you.';
}

function renderMoodMap() {
  const map = document.getElementById('mood-map');
  if (!map) return;
  map.innerHTML = '';
  MOODS.forEach(mood => map.appendChild(buildOrb(mood)));
}

// Rebuild on mode change (focus mode uses a different layout)
window.MoodMap = {
  rebuild: renderMoodMap,
};

document.addEventListener('DOMContentLoaded', renderMoodMap);
