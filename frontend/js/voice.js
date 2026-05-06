/* ================================================================
   AURA — Voice Search
   Web Speech API + waveform animation + intent detection
================================================================ */

'use strict';

const VoiceSearch = (() => {
  let recognition   = null;
  let isListening   = false;
  let waveInterval  = null;
  let typeInterval  = null;

  // ── Elements ────────────────────────────────────────────────
  const overlay     = () => document.getElementById('voice-overlay');
  const prompt      = () => document.getElementById('voice-prompt');
  const hint        = () => document.getElementById('voice-hint');
  const micBtn      = () => document.getElementById('voice-mic-btn');
  const visual      = () => document.getElementById('voice-visual');
  const waveform    = () => document.getElementById('waveform');
  const transcript  = () => document.getElementById('transcript-text');
  const interpEl    = () => document.getElementById('interpretation-text');
  const interWrap   = () => document.getElementById('voice-interpretation');

  // ── Speech API setup ─────────────────────────────────────────
  function initRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return null;

    const rec = new SpeechRec();
    rec.continuous      = false;
    rec.interimResults  = true;
    rec.lang            = 'en-US';
    rec.maxAlternatives = 1;

    rec.onstart  = () => setListeningState(true);
    rec.onend    = () => setListeningState(false);
    rec.onerror  = e => { console.warn('Speech error:', e.error); setListeningState(false); };

    rec.onresult = e => {
      let interim = '', final = '';
      for (const r of e.results) {
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      const text = final || interim;
      updateTranscript(text);

      if (final) {
        setTimeout(() => handleQuery(final), 300);
      }
    };

    return rec;
  }

  // ── Listening state ──────────────────────────────────────────
  function setListeningState(active) {
    isListening = active;
    micBtn()?.classList.toggle('listening', active);
    visual()?.classList.toggle('listening', active);
    waveform()?.classList.toggle('active', active);

    if (active) {
      if (prompt()) prompt().textContent = 'Listening…';
      animateWaveBars(true);
    } else {
      if (prompt()) prompt().textContent = 'Tap to start speaking';
      animateWaveBars(false);
    }
  }

  // ── Waveform animation ───────────────────────────────────────
  function animateWaveBars(active) {
    const bars = document.querySelectorAll('.wave-bar');
    if (!active) {
      bars.forEach(b => { b.style.height = '8px'; b.style.opacity = '0.3'; });
      if (waveInterval) { clearInterval(waveInterval); waveInterval = null; }
      return;
    }
    waveInterval = setInterval(() => {
      bars.forEach(b => {
        const h = Math.random() * 44 + 6;
        b.style.height = `${h}px`;
        b.style.opacity = (0.4 + (h / 50) * 0.6).toFixed(2);
      });
    }, 120);
  }

  // ── Transcript display ───────────────────────────────────────
  function updateTranscript(text) {
    const el = transcript();
    if (!el) return;

    // Clear previous typewriter
    if (typeInterval) { clearInterval(typeInterval); typeInterval = null; }

    el.textContent = '';
    let i = 0;
    typeInterval = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) { clearInterval(typeInterval); typeInterval = null; }
    }, 28);
  }

  // ── Simulated voice query (for browsers without Speech API) ──
  function simulateQuery(query) {
    setListeningState(true);

    let i = 0;
    const el = transcript();
    if (el) el.textContent = '';

    const typeIt = setInterval(() => {
      if (el) el.textContent = query.slice(0, ++i);
      if (i >= query.length) {
        clearInterval(typeIt);
        setTimeout(() => {
          setListeningState(false);
          handleQuery(query);
        }, 400);
      }
    }, 45);
  }

  // ── Handle final query ───────────────────────────────────────
  async function handleQuery(query) {
    if (!query.trim()) return;

    const wrap  = interWrap();
    const inter = interpEl();
    if (wrap)  wrap.style.opacity = '0';
    if (inter) inter.textContent = '';

    window.App?.showAIThinking('Interpreting your mood');

    try {
      const data = await window.LocalAPI.searchIntent(query);

      // Show interpretation
      if (inter) inter.textContent = data.interpretation;
      if (wrap) {
        wrap.style.transition = 'opacity 0.4s ease';
        wrap.style.opacity = '1';
      }

      setTimeout(() => {
        close();
        window.App?.navigateTo('explore', {
          mood:           data.detectedMood,
          moodLabel:      data.moodLabel,
          interpretation: data.interpretation,
        });
      }, 1200);

    } catch (e) {
      console.error(e);
    } finally {
      window.App?.hideAIThinking();
    }
  }

  // ── Open / Close ─────────────────────────────────────────────
  function open() {
    const el = overlay();
    if (!el) return;
    el.hidden = false;
    el.removeAttribute('hidden');

    // Reset state
    const t = transcript();
    const inter = interpEl();
    const iw = interWrap();
    if (t) t.textContent = '';
    if (inter) inter.textContent = '';
    if (iw) iw.style.opacity = '0';
    if (prompt()) prompt().textContent = 'Tap to start speaking';
    setListeningState(false);

    // Mic click handler
    micBtn()?.addEventListener('click', onMicClick, { once: false });
  }

  function close() {
    const el = overlay();
    if (!el) return;
    el.hidden = true;
    if (isListening) { recognition?.stop(); setListeningState(false); }
  }

  function onMicClick() {
    if (isListening) {
      recognition?.stop();
      return;
    }

    // Try real Speech API first
    if (!recognition) recognition = initRecognition();
    if (recognition) {
      try { recognition.start(); return; } catch(e) { /* fall through to simulation */ }
    }

    // Fallback: simulate typing a demo query
    const demos = [
      "I need a treat today",
      "Something cozy for the weekend",
      "Find me a gift for a friend",
      "I can't focus at all",
      "I want something nostalgic",
    ];
    simulateQuery(demos[Math.floor(Math.random() * demos.length)]);
  }

  // ── Voice chip buttons ───────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.voice-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = chip.dataset.query;
        if (q) simulateQuery(q);
      });
    });
  });

  return { open, close, handleQuery };
})();

window.VoiceSearch = VoiceSearch;
