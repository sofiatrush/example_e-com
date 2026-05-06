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
    float:   { dur: '8.2s', delay: '3.0s' },
  },
];

let currentExpanding = null;

function buildOrb(mood) {
  const el = document.createElement('button');
  el.className           = 'mood-orb';
  el.dataset.moodId      = mood.id;
  el.setAttribute('role', 'listitem');
  el.setAttribute('aria-label', `Select mood: ${mood.label}`);

  // Size
  el.style.width  = `${mood.size}px`;
  el.style.height = `${mood.size}px`;

  // Position
  Object.entries(mood.pos).forEach(([k, v]) => { el.style[k] = v; });

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
  `;

  el.addEventListener('click', () => onMoodSelect(mood, el));
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
      el.style.transition = '';
      el.style.position   = '';
      el.style.left       = '';
      el.style.top        = '';
      el.style.width      = `${mood.size}px`;
      el.style.height     = `${mood.size}px`;
      el.style.transform  = mood.pos.transform || '';
      el.style.borderRadius = '';
      el.style.zIndex     = '';
      el.style.opacity    = '';
      currentExpanding = null;
    }, 700);
  }, 500);
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
