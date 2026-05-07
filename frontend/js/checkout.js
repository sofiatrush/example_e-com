/* ================================================================
   AURA — Checkout Flow
   3-step: Shipping → Payment → Confirm → Success
================================================================ */

'use strict';

const Checkout = (() => {
  let currentStep = 1;
  let deliveryCost = 0;
  let promoDiscount = 0;
  const VALID_PROMOS = { 'AURA10': 10, 'WELCOME': 15, 'FEST20': 20 };

  const $ = id => document.getElementById(id);

  /* ── Open Checkout ─────────────────────────────────────────── */
  function open() {
    // Close cart panel first
    window.Cart?.closePanel?.();

    // Reset to step 1
    goToStep(1);
    promoDiscount = 0;
    deliveryCost  = 0;

    // Populate summary from cart
    populateSummary();

    // Navigate to checkout view
    window.App?.navigateTo('checkout');
  }

  /* ── Step Navigation ──────────────────────────────────────── */
  function goToStep(step) {
    currentStep = step;

    // Update panels
    for (let i = 1; i <= 3; i++) {
      const panel = $(`checkout-panel-${i}`);
      if (!panel) continue;
      panel.classList.toggle('checkout-panel--hidden', i !== step);
    }

    // Update step indicators
    document.querySelectorAll('.checkout-step').forEach(el => {
      const n = parseInt(el.dataset.step);
      el.classList.toggle('checkout-step--active', n === step);
      el.classList.toggle('checkout-step--done',   n < step);
    });
    document.querySelectorAll('.checkout-step__line').forEach((line, i) => {
      line.classList.toggle('checkout-step__line--done', i < step - 1);
    });

    // Scroll top
    const shell = document.querySelector('.checkout-shell');
    if (shell) shell.scrollTop = 0;

    // On step 3: populate confirm summary
    if (step === 3) buildConfirmSummary();
  }

  /* ── Populate Order Summary ───────────────────────────────── */
  function populateSummary() {
    const items   = getCartItems();
    const itemsEl = $('checkout-summary-items');
    const countEl = $('checkout-summary-count');
    const subEl   = $('checkout-sub');
    const totalEl = $('checkout-total');
    const aiEl    = $('checkout-ai-note');

    if (!itemsEl) return;

    itemsEl.innerHTML = items.map(item => `
      <div class="co-summary-item">
        <div class="co-summary-item__visual" style="background:${item.gradient}"></div>
        <div class="co-summary-item__info">
          <div class="co-summary-item__name">${item.name}</div>
          <div class="co-summary-item__price">$${item.price}</div>
        </div>
      </div>
    `).join('') || '<p class="co-summary-empty">Your cart is empty</p>';

    if (countEl) countEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;

    const sub = items.reduce((s, i) => s + i.price, 0);
    if (subEl)   subEl.textContent   = `$${sub}`;
    updateTotal(sub);

    if (aiEl) {
      if (sub < 50)       aiEl.textContent = 'A nice treat — well chosen ✦';
      else if (sub < 120) aiEl.textContent = 'Great picks — AI approved ✦';
      else if (sub < 250) aiEl.textContent = 'You\'re building something special ✦';
      else                aiEl.textContent = 'Exceptional taste — going all out ✦';
    }
  }

  function updateTotal(sub) {
    if (sub === undefined) {
      sub = getCartItems().reduce((s, i) => s + i.price, 0);
    }
    const totalEl    = $('checkout-total');
    const deliveryEl = $('checkout-delivery-cost');
    const promoEl    = $('checkout-promo-row');
    const promoValEl = $('checkout-promo-val');

    if (deliveryEl) deliveryEl.textContent = deliveryCost === 0 ? 'Free' : `$${deliveryCost.toFixed(2)}`;
    if (promoEl)    promoEl.hidden = promoDiscount === 0;
    if (promoValEl) promoValEl.textContent = `–$${promoDiscount}`;

    const total = Math.max(0, sub + deliveryCost - promoDiscount);
    if (totalEl) totalEl.textContent = `$${total.toFixed(2).replace('.00', '')}`;
  }

  /* ── Delivery option toggling ─────────────────────────────── */
  function initDeliveryOpts() {
    document.querySelectorAll('.delivery-opt input[type=radio]').forEach(radio => {
      radio.addEventListener('change', () => {
        document.querySelectorAll('.delivery-opt').forEach(o => o.classList.remove('delivery-opt--active'));
        radio.closest('.delivery-opt')?.classList.add('delivery-opt--active');
        deliveryCost = radio.value === 'express' ? 9.99 : 0;
        updateTotal();
      });
    });
  }

  /* ── Payment tabs ─────────────────────────────────────────── */
  function initPayTabs() {
    document.querySelectorAll('.pay-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('pay-tab--active'));
        tab.classList.add('pay-tab--active');
        const cardFields = $('pay-card-fields');
        const altField   = $('pay-alt-field');
        if (tab.dataset.pay === 'card') {
          cardFields?.removeAttribute('hidden');
          if (altField) altField.hidden = true;
        } else {
          cardFields?.setAttribute('hidden', '');
          if (altField) altField.hidden = false;
        }
      });
    });
  }

  /* ── Card number formatting ───────────────────────────────── */
  function initCardFormatting() {
    const cardInput = $('co-card');
    if (!cardInput) return;
    cardInput.addEventListener('input', () => {
      let val = cardInput.value.replace(/\D/g, '').slice(0, 16);
      cardInput.value = val.match(/.{1,4}/g)?.join(' ') || val;

      // Brand icon
      const icon = $('card-brand-icon');
      if (icon) {
        if      (val.startsWith('4'))  icon.textContent = '💙'; // Visa
        else if (val.startsWith('5'))  icon.textContent = '🔴'; // Mastercard
        else if (val.startsWith('37')) icon.textContent = '🟢'; // Amex
        else                           icon.textContent = '💳';
      }
    });

    const expiry = $('co-expiry');
    if (expiry) {
      expiry.addEventListener('input', () => {
        let v = expiry.value.replace(/\D/g, '').slice(0, 4);
        if (v.length >= 2) v = v.slice(0,2) + ' / ' + v.slice(2);
        expiry.value = v;
      });
    }
  }

  /* ── Promo Code ───────────────────────────────────────────── */
  function initPromo() {
    $('promo-apply-btn')?.addEventListener('click', () => {
      const input = $('co-promo');
      const msg   = $('promo-msg');
      const code  = input?.value?.trim().toUpperCase();
      if (!code) return;

      if (VALID_PROMOS[code]) {
        promoDiscount = VALID_PROMOS[code];
        if (msg) {
          msg.textContent = `✓ Promo applied — $${promoDiscount} off!`;
          msg.className   = 'promo-msg promo-msg--success';
        }
        if (input) input.disabled = true;
        $('promo-apply-btn').textContent = 'Applied ✓';
        $('promo-apply-btn').disabled    = true;
        updateTotal();
      } else {
        if (msg) {
          msg.textContent = 'Invalid promo code. Try AURA10 or FEST20.';
          msg.className   = 'promo-msg promo-msg--error';
        }
        if (input) {
          input.style.borderColor = 'var(--c-purple)';
          setTimeout(() => { input.style.borderColor = ''; }, 1200);
        }
      }
    });
  }

  /* ── Confirm summary (step 3) ─────────────────────────────── */
  function buildConfirmSummary() {
    const el    = $('confirm-summary');
    if (!el)    return;
    const items = getCartItems();
    const sub   = items.reduce((s, i) => s + i.price, 0);
    const total = Math.max(0, sub + deliveryCost - promoDiscount);

    const shipping = [
      $('co-first')?.value, $('co-last')?.value
    ].filter(Boolean).join(' ');
    const address = [$('co-address')?.value, $('co-city')?.value].filter(Boolean).join(', ');
    const delivery = deliveryCost > 0 ? 'Express ($9.99)' : 'Standard (Free)';

    el.innerHTML = `
      <div class="confirm-row">
        <div class="confirm-row__label">Ship to</div>
        <div class="confirm-row__val">${shipping || '—'}<br><small>${address || '—'}</small></div>
      </div>
      <div class="confirm-row">
        <div class="confirm-row__label">Delivery</div>
        <div class="confirm-row__val">${delivery}</div>
      </div>
      <div class="confirm-row">
        <div class="confirm-row__label">Items</div>
        <div class="confirm-row__val">${items.map(i => `<div>${i.name} — $${i.price}</div>`).join('')}</div>
      </div>
      ${promoDiscount > 0 ? `<div class="confirm-row"><div class="confirm-row__label">Promo</div><div class="confirm-row__val checkout-promo-saving">–$${promoDiscount}</div></div>` : ''}
      <div class="confirm-row confirm-row--total">
        <div class="confirm-row__label">Total due</div>
        <div class="confirm-row__val">${'$' + total.toFixed(2).replace('.00','')}</div>
      </div>
    `;
  }

  /* ── Place Order ──────────────────────────────────────────── */
  function placeOrder() {
    const btn      = $('checkout-place-btn');
    const textSpan = btn?.querySelector('.checkout-place-btn__text');
    if (!btn) return;

    btn.disabled = true;
    if (textSpan) textSpan.textContent = 'Processing…';
    btn.classList.add('loading');

    window.App?.showAIThinking('Confirming your order…');

    setTimeout(() => {
      window.App?.hideAIThinking();
      showSuccess();
    }, 1800);
  }

  function showSuccess() {
    const form = document.querySelector('.checkout-shell');
    const succ = $('checkout-success');
    if (form) form.style.display = 'none';
    if (succ) { succ.hidden = false; succ.removeAttribute('hidden'); }

    // Random order number
    const orderNum = 'AU-' + Math.random().toString(36).slice(2,8).toUpperCase();
    const numEl = $('checkout-order-num');
    if (numEl) numEl.textContent = `Order #${orderNum}`;

    // Confetti-like success animation handled by CSS
  }

  /* ── Helpers ──────────────────────────────────────────────── */
  function getCartItems() {
    try {
      return JSON.parse(localStorage.getItem('aura_cart') || '[]');
    } catch { return []; }
  }

  /* ── Init ─────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    initDeliveryOpts();
    initPayTabs();
    initCardFormatting();
    initPromo();

    // Step navigation
    $('checkout-next-1')?.addEventListener('click', () => goToStep(2));
    $('checkout-next-2')?.addEventListener('click', () => goToStep(3));
    $('checkout-back-1')?.addEventListener('click', () => goToStep(1));
    $('checkout-back-2')?.addEventListener('click', () => goToStep(2));

    // Back to cart
    $('back-checkout')?.addEventListener('click', () => {
      window.App?.navigateTo('catalog');
      window.Cart?.openPanel?.();
    });

    // Place order
    $('checkout-place-btn')?.addEventListener('click', placeOrder);

    // Success CTA
    $('checkout-success-home')?.addEventListener('click', () => {
      // Reset success overlay
      const form = document.querySelector('.checkout-shell');
      const succ = $('checkout-success');
      if (form) form.style.display = '';
      if (succ) succ.hidden = true;
      // Reset place btn
      const btn  = $('checkout-place-btn');
      const span = btn?.querySelector('.checkout-place-btn__text');
      if (btn)  { btn.disabled = false; btn.classList.remove('loading'); }
      if (span)   span.textContent = 'Place order';
      promoDiscount = 0;

      window.App?.navigateTo('catalog');
    });

    // Wire checkout button in cart
    $('btn-checkout')?.addEventListener('click', open);

    // Expose
    window.Checkout = { open };
  });

  return { open };
})();
