/* ================================================================
   AURA — Smart Cart
   State management · adaptive suggestions · budget indicator
================================================================ */

'use strict';

const Cart = (() => {
  const BUDGET_CAP = 300; // $300 reference budget

  // ── State ────────────────────────────────────────────────────
  let items = loadFromStorage();

  function loadFromStorage() {
    try {
      return JSON.parse(localStorage.getItem('aura_cart') || '[]');
    } catch { return []; }
  }
  function saveToStorage() {
    localStorage.setItem('aura_cart', JSON.stringify(items));
  }

  // ── Item Operations ──────────────────────────────────────────
  function addItem(product) {
    if (items.some(i => i.id === product.id)) {
      // Already in cart — flash the panel
      openPanel();
      highlightItem(product.id);
      return;
    }
    items.push({
      id:       product.id,
      name:     product.name,
      price:    product.price,
      gradient: product.gradient,
      complementary: product.complementary || [],
    });
    saveToStorage();
    render();
    updateBadge();
    openPanel();
    updateSuggestions();
  }

  function removeItem(id) {
    items = items.filter(i => i.id !== id);
    saveToStorage();
    render();
    updateBadge();
    updateSuggestions();
  }

  function highlightItem(id) {
    const el = document.querySelector(`.cart-item[data-id="${id}"]`);
    if (!el) return;
    el.style.borderColor = 'var(--c-purple)';
    el.style.boxShadow   = '0 0 14px var(--c-purple-lo)';
    setTimeout(() => {
      el.style.borderColor = '';
      el.style.boxShadow   = '';
    }, 1200);
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

  // ── Rendering ────────────────────────────────────────────────
  function render() {
    const empty    = document.getElementById('cart-empty');
    const itemsEl  = document.getElementById('cart-items');
    const budgetEl = document.getElementById('cart-budget');
    const subEl    = document.getElementById('cart-subtotal');
    const totalLbl = document.getElementById('cart-total-label');
    const fillEl   = document.getElementById('budget-fill');
    const noteEl   = document.getElementById('budget-note-cart');

    if (!itemsEl) return;

    if (items.length === 0) {
      empty?.removeAttribute('hidden');
      if (budgetEl) budgetEl.hidden = true;
      itemsEl.innerHTML = '';
      if (subEl) subEl.textContent = '$0';
      return;
    }

    empty?.setAttribute('hidden', '');

    // Render items
    itemsEl.innerHTML = items.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item__visual" style="background:${item.gradient}"></div>
        <div class="cart-item__info">
          <div class="cart-item__name">${item.name}</div>
          <div class="cart-item__price">$${item.price}</div>
        </div>
        <button class="cart-item__remove" data-remove-id="${item.id}" aria-label="Remove ${item.name}">×</button>
      </div>
    `).join('');

    itemsEl.querySelectorAll('[data-remove-id]').forEach(btn => {
      btn.addEventListener('click', () => removeItem(parseInt(btn.dataset.removeId)));
    });

    // Total
    const total = items.reduce((s, i) => s + i.price, 0);
    if (subEl) subEl.textContent = `$${total}`;
    if (totalLbl) totalLbl.textContent = `$${total}`;

    // Budget bar
    if (budgetEl) budgetEl.hidden = false;
    const pct = Math.min((total / BUDGET_CAP) * 100, 100);
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (noteEl) {
      if (total < 80)       noteEl.textContent = 'Well within the average Aura order';
      else if (total < 160) noteEl.textContent = 'A solid treat-yourself haul ✦';
      else if (total < 260) noteEl.textContent = 'You\'re building a lifestyle, not just a cart';
      else                  noteEl.textContent  = 'Going all out — we love to see it';
    }
  }

  // ── Budget-aware suggestions ──────────────────────────────────
  async function updateSuggestions() {
    const sugSection = document.getElementById('cart-suggestions');
    const sugList    = document.getElementById('cart-suggestion-list');
    if (!sugSection || !sugList) return;

    if (items.length === 0) { sugSection.hidden = true; return; }

    // Collect complementary ids from cart items
    const cartIds = new Set(items.map(i => i.id));
    const compIds = new Set(items.flatMap(i => i.complementary || []));
    const filteredIds = [...compIds].filter(id => !cartIds.has(id));

    if (filteredIds.length === 0) { sugSection.hidden = true; return; }

    const total = items.reduce((s, i) => s + i.price, 0);

    try {
      const data = await window.LocalAPI.getProducts({ limit: 12 });
      const candidates = data.products
        .filter(p => filteredIds.includes(p.id) && p.price + total < BUDGET_CAP * 1.1)
        .slice(0, 3);

      if (candidates.length === 0) { sugSection.hidden = true; return; }

      sugSection.hidden = false;
      sugList.innerHTML = candidates.map(p => `
        <div class="cart-suggestion-item" data-add-id="${p.id}">
          <div class="cart-suggestion-item__visual" style="background:${p.gradient}"></div>
          <span class="cart-suggestion-item__name">${p.name}</span>
          <span class="cart-suggestion-item__price">$${p.price}</span>
          <span class="cart-suggestion-item__add">+</span>
        </div>
      `).join('');

      sugList.querySelectorAll('.cart-suggestion-item').forEach(el => {
        el.addEventListener('click', () => {
          const p = candidates.find(c => c.id === parseInt(el.dataset.addId));
          if (p) addItem(p);
        });
      });
    } catch (e) { console.error(e); }
  }

  // ── Badge ────────────────────────────────────────────────────
  function updateBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    badge.textContent = items.length;
    badge.classList.toggle('visible', items.length > 0);
  }

  // ── Init ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    render();
    updateBadge();
    if (items.length > 0) updateSuggestions();
  });

  return { addItem, removeItem, openPanel, closePanel };
})();

window.Cart = Cart;
