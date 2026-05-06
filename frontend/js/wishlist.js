/* ================================================================
   AURA — Wishlist
   Heart buttons · panel · AI prompts · localStorage persistence
================================================================ */
'use strict';

const Wishlist = (() => {
  let items = load();

  function load() {
    try { return JSON.parse(localStorage.getItem('aura_wishlist') || '[]'); }
    catch { return []; }
  }
  function save() { localStorage.setItem('aura_wishlist', JSON.stringify(items)); }

  // ── Core operations ──────────────────────────────────────────
  function addItem(product) {
    if (items.some(i => i.id === product.id)) return;
    items.push({
      id:       product.id,
      name:     product.name,
      price:    product.price,
      gradient: product.gradient,
      tagline:  product.tagline,
      rating:   product.rating,
      originalPrice: product.originalPrice,
      aiHints:  product.aiHints,
      reviewSummary: product.reviewSummary,
    });
    save();
    renderPanel();
    updateBadge();
    animateHeartBtn(product.id, true);
  }

  function removeItem(id) {
    items = items.filter(i => i.id !== id);
    save();
    renderPanel();
    updateBadge();
    animateHeartBtn(id, false);
  }

  function toggle(product) {
    if (has(product.id)) removeItem(product.id);
    else addItem(product);
  }

  function has(id) { return items.some(i => i.id === id); }
  function getItems() { return [...items]; }

  // ── Heart button visual state ────────────────────────────────
  function animateHeartBtn(productId, on) {
    document.querySelectorAll(`.heart-btn[data-pid="${productId}"]`).forEach(btn => {
      btn.classList.toggle('wishlisted', on);
      if (on) {
        btn.style.transform = 'scale(1.3)';
        setTimeout(() => { btn.style.transform = ''; }, 250);
      }
    });
  }

  function syncAllHearts() {
    document.querySelectorAll('.heart-btn').forEach(btn => {
      const pid = parseInt(btn.dataset.pid);
      btn.classList.toggle('wishlisted', has(pid));
    });
  }

  // ── Badge ────────────────────────────────────────────────────
  function updateBadge() {
    const badge = document.getElementById('wishlist-count');
    if (!badge) return;
    badge.textContent = items.length;
    badge.classList.toggle('visible', items.length > 0);
  }

  // ── Page navigation ──────────────────────────────────────────
  function openPanel() {
    window.App?.navigateTo?.('wishlist');
    window.AuraChat?.updateContextLabel?.();
  }
  function closePanel() {
    // Re-render if on wishlist page and called programmatically
  }

  // ── Render panel (triggers page re-render if on wishlist view) ──
  function renderPanel() {
    window.App?.renderWishlistPage?.();
  }

  // ── Heart button factory ─────────────────────────────────────
  function createHeartBtn(product) {
    const btn = document.createElement('button');
    btn.className = `heart-btn${has(product.id) ? ' wishlisted' : ''}`;
    btn.dataset.pid = product.id;
    btn.setAttribute('aria-label', has(product.id) ? 'Remove from wishlist' : 'Save to wishlist');
    btn.title = 'Save to wishlist';
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    `;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggle(product);
      btn.setAttribute('aria-label', has(product.id) ? 'Remove from wishlist' : 'Save to wishlist');
    });
    return btn;
  }

  // ── Init ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    updateBadge();
    document.getElementById('wishlist-btn')?.addEventListener('click', openPanel);
  });

  // Observer: sync hearts when new cards are added to DOM
  const observer = new MutationObserver(() => syncAllHearts());
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });

  return { addItem, removeItem, toggle, has, getItems, openPanel, closePanel, createHeartBtn, syncAllHearts };
})();

window.Wishlist = Wishlist;
