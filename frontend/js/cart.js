/* ================================================================
   AURA — Smart Cart  (budget slider edition)
================================================================ */
'use strict';

const Cart = (() => {
  const BUDGET_CAP = 300;
  const S_MIN = 20;
  const S_MAX = 500;

  let items = load();

  function load() {
    try { return JSON.parse(localStorage.getItem('aura_cart') || '[]'); }
    catch { return []; }
  }
  function save() { localStorage.setItem('aura_cart', JSON.stringify(items)); }

  // ── CRUD ─────────────────────────────────────────────────────
  function addItem(product) {
    if (items.some(i => i.id === product.id)) { openPanel(); highlight(product.id); return; }
    items.push({
      id: product.id, name: product.name, price: product.price,
      gradient: product.gradient, category: product.category,
      complementary: product.complementary || [],
    });
    save(); render(); updateBadge(); openPanel(); updateSuggestions();
  }

  function removeItem(id) {
    items = items.filter(i => i.id !== id);
    save(); render(); updateBadge(); updateSuggestions();
  }

  function highlight(id) {
    const el = document.querySelector(`.cart-item[data-id="${id}"]`);
    if (!el) return;
    el.style.borderColor = 'var(--c-purple)';
    el.style.boxShadow   = '0 0 14px var(--c-purple-lo)';
    setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 1200);
  }

  // ── Panel ────────────────────────────────────────────────────
  function openPanel() {
    document.getElementById('cart-panel')?.classList.add('open');
    document.getElementById('cart-backdrop')?.classList.add('visible');
  }
  function closePanel() {
    document.getElementById('cart-panel')?.classList.remove('open');
    document.getElementById('cart-backdrop')?.classList.remove('visible');
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    const empty    = document.getElementById('cart-empty');
    const itemsEl  = document.getElementById('cart-items');
    const budgetEl = document.getElementById('cart-budget');
    const subEl    = document.getElementById('cart-subtotal');
    if (!itemsEl) return;

    if (items.length === 0) {
      empty?.removeAttribute('hidden');
      if (budgetEl) budgetEl.hidden = true;
      itemsEl.innerHTML = '';
      if (subEl) subEl.textContent = '$0';
      const a = document.getElementById('cart-budget-alts');
      if (a) a.hidden = true;
      return;
    }

    empty?.setAttribute('hidden', '');
    itemsEl.innerHTML = items.map(it => `
      <div class="cart-item" data-id="${it.id}">
        <div class="cart-item__visual" style="background:${it.gradient}"></div>
        <div class="cart-item__info">
          <div class="cart-item__name">${it.name}</div>
          <div class="cart-item__price">$${it.price}</div>
        </div>
        <button class="cart-item__remove" data-remove-id="${it.id}" aria-label="Remove">×</button>
      </div>`).join('');

    itemsEl.querySelectorAll('[data-remove-id]').forEach(btn =>
      btn.addEventListener('click', () => removeItem(+btn.dataset.removeId)));

    const total = items.reduce((s, i) => s + i.price, 0);
    if (subEl) subEl.textContent = `$${total}`;
    if (budgetEl) budgetEl.hidden = false;

    // Init slider to current total
    const slider = document.getElementById('budget-slider');
    const sval   = document.getElementById('budget-slider-val');
    if (slider && sval) {
      const v = Math.min(Math.max(total, S_MIN), S_MAX);
      slider.value = v;
      sval.textContent = `$${v}`;
      paintTrack(slider, v);
      setNote(v, total);
      showAlts(v, total);
    }
  }

  // ── Slider helpers ───────────────────────────────────────────
  function paintTrack(slider, val) {
    const pct = ((val - S_MIN) / (S_MAX - S_MIN)) * 100;
    slider.style.background =
      `linear-gradient(90deg,#6D2932 0%,#6D2932 ${pct}%,rgba(199,183,163,0.14) ${pct}%,rgba(199,183,163,0.14) 100%)`;
  }

  function setNote(budget, total) {
    if (total == null) total = items.reduce((s, i) => s + i.price, 0);
    const el = document.getElementById('budget-note-cart');
    if (!el) return;
    const diff = budget - total;
    if (diff < -10) {
      el.textContent = `$${-diff} over budget — cheaper picks below`;
      el.style.color  = 'var(--c-peach)';
    } else if (diff > 50) {
      el.textContent = `$${diff} to spare — premium upgrades below`;
      el.style.color  = 'var(--c-text-ai)';
    } else {
      el.textContent = diff >= 0 ? 'Right on budget!' : `$${-diff} over`;
      el.style.color  = 'var(--c-text3)';
    }
  }

  async function showAlts(budget, total) {
    if (total == null) total = items.reduce((s, i) => s + i.price, 0);
    const wrap  = document.getElementById('cart-budget-alts');
    const head  = document.getElementById('cart-budget-alts-head');
    const list  = document.getElementById('cart-budget-alts-list');
    if (!wrap || !head || !list) return;
    if (!items.length) { wrap.hidden = true; return; }

    const diff = budget - total;
    if (diff >= -10 && diff <= 50) { wrap.hidden = true; return; }

    try {
      const { products } = await window.LocalAPI.getProducts({ limit: 100 });
      const cartIds  = new Set(items.map(i => i.id));
      const cartCats = new Set(items.map(i => i.category).filter(Boolean));
      let picks = [], label = '';

      if (diff < -10) {
        label = '✦ Cheaper alternatives within your budget';
        picks = products
          .filter(p => !cartIds.has(p.id) && p.price <= budget && cartCats.has(p.category))
          .sort((a, b) => b.rating - a.rating).slice(0, 3);
      } else {
        label = '✦ Premium upgrades — worth the extra';
        picks = products
          .filter(p => !cartIds.has(p.id) && p.price + total <= budget && p.rating >= 4.5)
          .sort((a, b) => b.price - a.price).slice(0, 3);
      }

      if (!picks.length) { wrap.hidden = true; return; }

      head.textContent = label;
      list.innerHTML = picks.map(p => `
        <div class="cart-suggestion-item" data-alt="${p.id}">
          <div class="cart-suggestion-item__visual" style="background:${p.gradient}"></div>
          <span class="cart-suggestion-item__name">${p.name}</span>
          <span class="cart-suggestion-item__price">$${p.price}</span>
          <span class="cart-suggestion-item__add">+</span>
        </div>`).join('');

      list.querySelectorAll('[data-alt]').forEach(el =>
        el.addEventListener('click', () => {
          const p = picks.find(x => x.id === +el.dataset.alt);
          if (p) addItem(p);
        }));

      wrap.hidden = false;
    } catch (e) { console.error(e); wrap.hidden = true; }
  }

  // ── Complementary suggestions ────────────────────────────────
  async function updateSuggestions() {
    const sec  = document.getElementById('cart-suggestions');
    const list = document.getElementById('cart-suggestion-list');
    if (!sec || !list) return;
    if (!items.length) { sec.hidden = true; return; }

    const cartIds    = new Set(items.map(i => i.id));
    const compIds    = new Set(items.flatMap(i => i.complementary || []));
    const candidates_ids = [...compIds].filter(id => !cartIds.has(id));
    if (!candidates_ids.length) { sec.hidden = true; return; }

    const total = items.reduce((s, i) => s + i.price, 0);
    try {
      const { products } = await window.LocalAPI.getProducts({ limit: 12 });
      const picks = products.filter(p => candidates_ids.includes(p.id) && p.price + total < BUDGET_CAP * 1.1).slice(0, 3);
      if (!picks.length) { sec.hidden = true; return; }

      sec.hidden = false;
      list.innerHTML = picks.map(p => `
        <div class="cart-suggestion-item" data-add-id="${p.id}">
          <div class="cart-suggestion-item__visual" style="background:${p.gradient}"></div>
          <span class="cart-suggestion-item__name">${p.name}</span>
          <span class="cart-suggestion-item__price">$${p.price}</span>
          <span class="cart-suggestion-item__add">+</span>
        </div>`).join('');

      list.querySelectorAll('[data-add-id]').forEach(el =>
        el.addEventListener('click', () => {
          const p = picks.find(x => x.id === +el.dataset.addId);
          if (p) addItem(p);
        }));
    } catch (e) { console.error(e); }
  }

  // ── Badge ────────────────────────────────────────────────────
  function updateBadge() {
    const b = document.getElementById('cart-count');
    if (!b) return;
    b.textContent = items.length;
    b.classList.toggle('visible', items.length > 0);
  }

  // ── Init ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    render(); updateBadge();
    if (items.length) updateSuggestions();

    const slider = document.getElementById('budget-slider');
    const sval   = document.getElementById('budget-slider-val');
    if (slider && sval) {
      slider.addEventListener('input', () => {
        const v     = +slider.value;
        const total = items.reduce((s, i) => s + i.price, 0);
        sval.textContent = `$${v}`;
        paintTrack(slider, v);
        setNote(v, total);
        showAlts(v, total);
      });
    }
  });

  return { addItem, removeItem, openPanel, closePanel };
})();

window.Cart = Cart;
