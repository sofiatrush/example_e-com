/* ================================================================
   AURA — App Core
   View management · API calls · product rendering · mode switching
================================================================ */

'use strict';

/* ── Global State ────────────────────────────────────────────── */
const state = {
  currentView:        'catalog',
  currentMood:        null,
  currentMoodLabel:   null,
  products:           [],
  productsOffset:     0,
  productsTotal:      0,
  selectedProduct:    null,
  compareIds:         new Set(),
  mode:               'discover',
  highContrast:       false,
  textSize:           'normal',   // 'normal' | 'large' | 'xl'
  catalogReturnView:  false,
  wishlistReturnView: false,
};

/* ── Helpers ─────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const show = el => { if (el) { el.hidden = false; el.removeAttribute('hidden'); } };
const hide = el => { if (el) el.hidden = true; };

function showAIThinking(text = 'Reading your intent') {
  const el = $('ai-thinking');
  el.querySelector('.ai-thinking__text').textContent = text;
  el.classList.add('visible');
}
function hideAIThinking() {
  $('ai-thinking').classList.remove('visible');
}

/* All API calls go through LocalAPI (api.js) — no backend needed */

function starsHTML(rating) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function savings(price, original) {
  if (!original) return null;
  return Math.round(((original - price) / original) * 100);
}

/* ── View Router ─────────────────────────────────────────────── */
function navigateTo(viewId, data = {}) {
  const prev = document.querySelector('.view--active');
  const next = document.querySelector(`[data-view="${viewId}"]`);
  if (!next || prev === next) return;

  if (prev) {
    prev.classList.add('view--exit');
    setTimeout(() => {
      prev.classList.remove('view--active', 'view--exit');
    }, 350);
  }

  next.classList.add('view--active');
  next.scrollTop = 0;
  state.currentView = viewId;

  if (viewId === 'explore' && data.mood) loadExplore(data.mood, data.moodLabel, data.interpretation);
  if (viewId === 'product' && data.productId) loadProductDetail(data.productId);
  if (viewId === 'wishlist') renderWishlistPage();
}

/* ── Mode Switcher ───────────────────────────────────────────── */
function initModeSwitcher() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
  });

  $('contrast-toggle')?.addEventListener('click', () => {
    state.highContrast = !state.highContrast;
    document.body.classList.toggle('high-contrast', state.highContrast);
  });

  // Font size toggle — cycles normal → large → xl → normal
  $('font-size-toggle')?.addEventListener('click', () => {
    const cycle = { normal: 'large', large: 'xl', xl: 'normal' };
    const labels = { normal: 'A', large: 'A+', xl: 'A↑↑' };
    state.textSize = cycle[state.textSize] || 'normal';
    document.body.setAttribute('data-text-size', state.textSize);
    const lbl = $('font-size-label');
    if (lbl) lbl.textContent = labels[state.textSize];
  });
}

function switchMode(mode) {
  state.mode = mode;
  document.documentElement.setAttribute('data-mode', mode);
  document.body.setAttribute('data-mode', mode);

  document.querySelectorAll('.mode-btn').forEach(b => {
    const active = b.dataset.mode === mode;
    b.classList.toggle('mode-btn--active', active);
    b.setAttribute('aria-pressed', active.toString());
  });

  // Rebuild mood map for focus mode (linear layout)
  if (state.currentView === 'entry') {
    window.MoodMap?.rebuild?.();
  }
}

/* ── Explore View ────────────────────────────────────────────── */
async function loadExplore(mood, moodLabel, interpretation) {
  state.currentMood      = mood;
  state.currentMoodLabel = moodLabel || mood;
  state.productsOffset   = 0;

  $('current-mood-tag').textContent = moodLabel || mood;
  $('explore-title').textContent    = 'Curated for your energy';
  $('explore-ai-note-text').textContent = interpretation || 'AI found items that match your vibe';

  showAIThinking('Curating your selection');

  try {
    const data = await window.LocalAPI.getProducts({ mood, limit: 6, offset: 0 });
    state.products      = data.products;
    state.productsTotal = data.total;
    state.productsOffset = 6;
    renderProductGrid(data.products, false);
  } catch (e) {
    console.error(e);
  } finally {
    hideAIThinking();
  }
}

async function loadMore() {
  if (state.productsOffset >= state.productsTotal) return;
  showAIThinking('Loading more');
  try {
    const data = await window.LocalAPI.getProducts({ mood: state.currentMood, limit: 6, offset: state.productsOffset });
    state.products      = [...state.products, ...data.products];
    state.productsOffset += 6;
    renderProductGrid(data.products, true);
  } catch (e) { console.error(e); }
  finally { hideAIThinking(); }
}

function renderProductGrid(products, append = false) {
  const grid = $('product-grid');
  if (!append) grid.innerHTML = '';

  products.forEach((p, i) => {
    const card = buildProductCard(p, i);
    grid.appendChild(card);
  });

  const btn = $('load-more-btn');
  if (btn) btn.style.display = state.productsOffset >= state.productsTotal ? 'none' : '';
}

function buildProductCard(p, index) {
  const div = document.createElement('div');
  div.className  = 'product-card';
  div.dataset.id = p.id;
  div.setAttribute('role', 'listitem');
  div.style.animationDelay = `${index * 0.07}s`;

  div.innerHTML = `
    <div class="card-gradient" style="background:${p.gradient};">
      ${p.badge ? `<div class="card-badge">${p.badge}</div>` : ''}
      <div class="card-ai-hints">
        <span class="card-ai-hint"><span class="card-ai-hint__icon">✦</span>${p.aiHints?.moodMatch || 'Perfect for your mood'}</span>
        ${(p.aiHints?.giftSuitability || p.aiHints?.giftScore || 0) >= 85 ? `<span class="card-ai-hint"><span class="card-ai-hint__icon">◎</span>Great gift</span>` : ''}
      </div>
      <button class="card-compare-check" data-id="${p.id}" title="Add to comparison" aria-label="Add to comparison">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>
    </div>
    <div class="card-body">
      <div class="card-category">${p.category}</div>
      <div class="card-name">${p.name}</div>
      <div class="card-tagline">${p.tagline}</div>
      <div class="card-footer">
        <div class="card-price-wrap">
          <span class="card-price">$${p.price}</span>
          ${p.originalPrice ? `<span class="card-price-original">$${p.originalPrice}</span>` : ''}
        </div>
        <div class="card-rating">
          <span class="card-stars">${starsHTML(p.rating)}</span>
          <span class="card-reviews">(${p.reviews})</span>
        </div>
      </div>
    </div>
    <div class="card-quick-add">
      <button class="card-quick-add__btn" data-add-id="${p.id}">+ Add to cart</button>
    </div>
  `;

  // Inject heart button into gradient area
  const gradientEl = div.querySelector('.card-gradient');
  if (gradientEl && window.Wishlist) {
    gradientEl.appendChild(window.Wishlist.createHeartBtn(p));
  }

  // Open detail view
  div.addEventListener('click', e => {
    if (e.target.closest('.card-compare-check') ||
        e.target.closest('.card-quick-add__btn') ||
        e.target.closest('.heart-btn')) return;
    navigateTo('product', { productId: p.id });
  });

  // Quick add to cart
  div.querySelector('.card-quick-add__btn')?.addEventListener('click', e => {
    e.stopPropagation();
    window.Cart?.addItem(p);
    div.style.transform = 'scale(0.97)';
    setTimeout(() => { div.style.transform = ''; }, 180);
  });

  // Compare checkbox
  div.querySelector('.card-compare-check')?.addEventListener('click', e => {
    e.stopPropagation();
    toggleCompare(p.id, div);
  });

  return div;
}

function animateAddToCart(card) {
  card.style.transform = 'scale(0.97)';
  setTimeout(() => { card.style.transform = ''; }, 180);
}

/* ── Compare Logic ───────────────────────────────────────────── */
function toggleCompare(id, cardEl) {
  const btn = cardEl?.querySelector('.card-compare-check');
  if (state.compareIds.has(id)) {
    state.compareIds.delete(id);
    btn?.classList.remove('checked');
  } else {
    if (state.compareIds.size >= 3) {
      const firstId = [...state.compareIds][0];
      state.compareIds.delete(firstId);
      document.querySelector(`.card-compare-check[data-id="${firstId}"]`)?.classList.remove('checked');
    }
    state.compareIds.add(id);
    btn?.classList.add('checked');
  }
  updateComparePopup();
}

function getActiveCompareIds() {
  return state.currentView === 'catalog' ? catalogState.compareIds : state.compareIds;
}

function updateComparePopup() {
  const popup = $('compare-popup');
  const previews = $('compare-popup-previews');
  const countEl = $('compare-popup-count');
  if (!popup) return;

  const activeIds = [...getActiveCompareIds()];
  const count = activeIds.length;

  if (count < 2) {
    popup.classList.remove('visible');
    return;
  }

  popup.classList.add('visible');
  if (countEl) countEl.textContent = count;

  if (previews) {
    const allProds = [
      ...(state.products || []),
      ...(catalogState.allProducts || []),
    ].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
    previews.innerHTML = activeIds.slice(0, 3).map(id => {
      const p = allProds.find(x => x.id === id);
      return p ? `<div class="compare-popup__preview" style="background:${p.gradient}" title="${p.name}"></div>` : '';
    }).join('');
  }
}

function clearAllCompare() {
  state.compareIds.clear();
  catalogState.compareIds.clear();
  document.querySelectorAll('.card-compare-check.checked').forEach(el => el.classList.remove('checked'));
  document.querySelectorAll('.cat-card__check.checked').forEach(el => el.classList.remove('checked'));
  document.querySelectorAll('.cat-card.comparing').forEach(c => c.classList.remove('comparing'));
  updateComparePopup();
}

async function openCompareFromPopup() {
  if (state.currentView === 'catalog') {
    state.compareIds = new Set(catalogState.compareIds);
  }
  await openCompare();
}

async function openCompare() {
  const modal = $('compare-modal');
  if (!modal) return;

  // ── Reset modal state before opening ──
  const grid     = $('compare-products');
  const thinking = $('verdict-thinking');
  const results  = $('verdict-results');
  if (grid)     grid.innerHTML = '';
  if (thinking) { thinking.style.display = 'flex'; }
  if (results)  { results.hidden = true; results.innerHTML = ''; }
  // Clear previous compare-chat if any
  modal.querySelector('.compare-chat-section')?.remove();

  show(modal);
  modal.removeAttribute('hidden');
  showAIThinking('Analyzing your choices');

  try {
    const ids  = [...state.compareIds];
    if (ids.length < 2) { hideAIThinking(); return; }
    const data = await window.LocalAPI.compare(ids);
    renderComparison(data);
  } catch (e) { console.error(e); }
  finally { hideAIThinking(); }
}

function renderComparison(data) {
  const grid = $('compare-products');
  if (!grid) return;

  grid.innerHTML = data.products.map(p => `
    <div class="compare-product-card ${data.verdict.bestForYou.id === p.id ? 'winner' : ''}">
      <div class="compare-product-card__visual" style="background:${p.gradient}"></div>
      <div class="compare-product-card__body">
        <div class="compare-product-card__name">${p.name}</div>
        <div class="compare-product-card__price">$${p.price}</div>
        <div class="compare-product-card__rating">${starsHTML(p.rating)} (${p.reviews})</div>
      </div>
    </div>
  `).join('');

  const thinking = $('verdict-thinking');
  const results  = $('verdict-results');
  if (thinking) thinking.style.display = 'none';
  if (results) {
    results.hidden = false;
    results.innerHTML = `
      <p class="verdict-summary">${data.verdict.summary}</p>
      <div class="verdict-cards">
        <div class="verdict-card">
          <div class="verdict-card__label best-for-you">✦ Best for you</div>
          <div class="verdict-card__name">${data.verdict.bestForYou.name}</div>
          <div class="verdict-card__reason">${data.verdict.bestForYou.reason}</div>
        </div>
        <div class="verdict-card">
          <div class="verdict-card__label best-value">◎ Best value</div>
          <div class="verdict-card__name">${data.verdict.bestValue.name}</div>
          <div class="verdict-card__reason">${data.verdict.bestValue.reason}</div>
        </div>
        <div class="verdict-card">
          <div class="verdict-card__label best-mood">◑ Best for mood</div>
          <div class="verdict-card__name">${data.verdict.bestForMood.name}</div>
          <div class="verdict-card__reason">${data.verdict.bestForMood.reason}</div>
        </div>
      </div>
    `;
  }

  // ── Inject inline chat follow-up below verdict ──
  const body = $('compare-modal')?.querySelector('.compare-modal__body');
  if (body) {
    const chatSection = document.createElement('div');
    chatSection.className = 'compare-chat-section';
    chatSection.innerHTML = `
      <div class="compare-chat-section__label">
        <span class="ai-icon">✦</span> Continue the conversation
      </div>
      <div class="compare-chat-mini">
        <div class="compare-chat-mini__msgs" id="compare-chat-msgs">
          <div class="compare-chat-mini__row">
            <div class="compare-chat-mini__text">
              AI verdict above is just the start — ask me anything about these products.
            </div>
          </div>
        </div>
        <div class="compare-chat-mini__input-row">
          <input class="compare-chat-mini__input" id="compare-chat-input"
                 placeholder="e.g. Which is better for gifting? I have a $80 budget…"
                 autocomplete="off">
          <button class="compare-chat-mini__send" id="compare-chat-send">Ask</button>
        </div>
      </div>
    `;
    body.appendChild(chatSection);

    // Wire compare chat
    const compareCtx = { compareIds: [...state.compareIds], products: data.products, verdict: data.verdict };
    const sendCompareMsg = async () => {
      const inp = document.getElementById('compare-chat-input');
      const msgs = document.getElementById('compare-chat-msgs');
      const val = inp?.value?.trim();
      if (!val || !msgs) return;
      inp.value = '';

      // User bubble
      const userRow = document.createElement('div');
      userRow.className = 'compare-chat-mini__row user';
      userRow.innerHTML = `<div class="compare-chat-mini__text">${val}</div>`;
      msgs.appendChild(userRow);
      msgs.scrollTop = msgs.scrollHeight;

      // AI typing + response
      const typingRow = document.createElement('div');
      typingRow.className = 'compare-chat-mini__row';
      typingRow.innerHTML = `<div class="compare-chat-mini__text" style="color:var(--c-text3)">Thinking…</div>`;
      msgs.appendChild(typingRow);
      msgs.scrollTop = msgs.scrollHeight;

      await new Promise(r => setTimeout(r, 700 + Math.random() * 500));

      const ctx = { compareIds: compareCtx.compareIds, product: null, wishlist: window.Wishlist?.getItems() || [], mood: state.currentMood };
      // Augment the message with product names for better context
      const enriched = val + ' ' + data.products.map(p => p.name).join(' ');
      const reply = await window.AuraChat ? window.AuraChat.send ? null : null : null;

      // Use same engine as main chat
      const names = data.products.map(p => p.name).join(' or ');
      let aiReply = '';
      const msg = val.toLowerCase();
      if (/gift/i.test(msg)) {
        const gifty = data.products.reduce((a,b) => (a.aiHints?.giftSuitability||0) > (b.aiHints?.giftSuitability||0) ? a : b);
        aiReply = `For gifting, I'd go with <strong>${gifty.name}</strong> — it has a ${gifty.aiHints?.giftSuitability}% gift suitability score and is something people remember receiving.`;
      } else if (/budget|price|cheap|afford|\$/i.test(msg)) {
        const cheap = data.products.reduce((a,b) => a.price < b.price ? a : b);
        aiReply = `If budget matters, <strong>${cheap.name}</strong> at $${cheap.price} is the easier decision${cheap.originalPrice ? ` (originally $${cheap.originalPrice})` : ''}.`;
      } else if (/better|best|choose|pick|recommend/i.test(msg)) {
        aiReply = `Based on ratings and reviews, <strong>${data.verdict.bestForYou.name}</strong> is my recommendation. ${data.verdict.bestForYou.reason}. Want me to dig deeper on anything specific?`;
      } else if (/mood|feeling|vibe/i.test(msg)) {
        aiReply = `For matching your current energy, <strong>${data.verdict.bestForMood.name}</strong> wins. ${data.verdict.bestForMood.reason}.`;
      } else {
        aiReply = `Great question about ${names}. The main difference is that <strong>${data.verdict.bestForYou.name}</strong> has a stronger overall profile (${data.products.find(p=>p.id===data.verdict.bestForYou.id)?.rating}★), while <strong>${data.verdict.bestValue.name}</strong> gives you better value per dollar. Which angle matters more to you?`;
      }

      typingRow.innerHTML = `<div class="compare-chat-mini__text">${aiReply}</div>`;
      msgs.scrollTop = msgs.scrollHeight;
    };

    document.getElementById('compare-chat-send')?.addEventListener('click', sendCompareMsg);
    document.getElementById('compare-chat-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); sendCompareMsg(); }
    });
  }
}

/* ── Product Detail ──────────────────────────────────────────── */
async function loadProductDetail(id) {
  showAIThinking('Enriching product data');
  try {
    const p = await window.LocalAPI.getProduct(id);
    state.selectedProduct = p;
    renderProductDetail(p);
  } catch (e) { console.error(e); }
  finally { hideAIThinking(); }
}

function renderProductDetail(p) {
  // Gradient
  const grad = $('detail-gradient');
  if (grad) grad.style.background = p.gradient;

  // Badge
  const badgeWrap = $('detail-product-badge');
  if (badgeWrap) badgeWrap.innerHTML = p.badge ? `<span class="detail-badge">${p.badge}</span>` : '';

  // AI Hints
  const hintMood = $('hint-mood');
  const hintGift = $('hint-gift');
  const hintBeh  = $('hint-behavior');
  if (hintMood) hintMood.textContent = p.aiHints?.moodMatch || '';
  if (hintGift) hintGift.textContent = `Gift score: ${p.aiHints?.giftSuitability}%`;
  if (hintBeh)  hintBeh.textContent  = p.aiHints?.behavioral || '';

  // Text fields
  const setText = (id, val) => { const el = $(id); if (el) el.textContent = val || ''; };
  setText('detail-category', p.category);
  setText('detail-name', p.name);
  setText('detail-tagline', p.tagline);
  setText('detail-stars', starsHTML(p.rating));
  setText('detail-reviews', `${p.rating} · ${p.reviews} reviews`);
  setText('detail-price', `$${p.price}`);
  setText('review-insight', p.aiInsights?.insight || '');

  const orig = $('detail-original');
  const savEl = $('detail-savings');
  if (orig) orig.textContent = p.originalPrice ? `$${p.originalPrice}` : '';
  const pct = savings(p.price, p.originalPrice);
  if (savEl) savEl.textContent = pct ? `Save ${pct}%` : '';
  if (savEl) savEl.style.display = pct ? '' : 'none';

  // Social proof
  const sp = $('social-proof-text');
  if (sp) sp.textContent = p.aiInsights?.peopleLikeYou || '';

  // Pros / Cons
  const prosList = $('pros-list');
  const consList = $('cons-list');
  if (prosList) prosList.innerHTML = (p.aiInsights?.pros || []).map(t => `<li>${t}</li>`).join('');
  if (consList) consList.innerHTML = (p.aiInsights?.cons || []).map(t => `<li>${t}</li>`).join('');

  // Complementary
  const compGrid = $('complementary-grid');
  if (compGrid && p.aiInsights?.peopleAlsoBought?.length) {
    compGrid.innerHTML = p.aiInsights.peopleAlsoBought.map(c => `
      <div class="comp-card" data-id="${c.id}" role="button" tabindex="0">
        <div class="comp-card__visual" style="background:${c.gradient}"></div>
        <div class="comp-card__name">${c.name}</div>
        <div class="comp-card__price">$${c.price}</div>
      </div>
    `).join('');

    compGrid.querySelectorAll('.comp-card').forEach(card => {
      const handler = () => {
        navigateTo('product', { productId: parseInt(card.dataset.id) });
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e => { if (e.key === 'Enter') handler(); });
    });
  }

  // Wire up add to cart
  const addBtn = $('detail-add-cart');
  if (addBtn) {
    addBtn.onclick = () => {
      window.Cart?.addItem(p);
      addBtn.textContent = 'Added ✓';
      addBtn.style.background = 'var(--c-teal)';
      setTimeout(() => {
        addBtn.textContent = 'Add to cart';
        addBtn.style.background = '';
      }, 1800);
    };
  }

  // Heart button on detail visual
  const detailVisual = $('detail-visual');
  const existingHeart = detailVisual?.querySelector('.heart-btn');
  existingHeart?.remove();
  if (detailVisual && window.Wishlist) {
    detailVisual.appendChild(window.Wishlist.createHeartBtn(p));
  }

  // "Ask AI about this" button — inject into actions if not already there
  const actions = document.querySelector('.detail-actions');
  if (actions && !actions.querySelector('.btn-ask-ai-product')) {
    const askBtn = document.createElement('button');
    askBtn.className = 'btn-secondary btn-ask-ai-product';
    askBtn.setAttribute('aria-label', 'Ask AI about this product');
    askBtn.innerHTML = '<span style="font-size:10px">✦</span> Ask AI';
    askBtn.addEventListener('click', () => {
      window.AuraChat?.open(`Tell me about ${p.name} — is it worth it?`);
    });
    actions.appendChild(askBtn);
  } else if (actions) {
    // Update existing button's handler for new product
    const existingAsk = actions.querySelector('.btn-ask-ai-product');
    if (existingAsk) {
      existingAsk.onclick = () => window.AuraChat?.open(`Tell me about ${p.name} — is it worth it?`);
    }
  }
}

/* ── Wishlist Page ───────────────────────────────────────────── */
function renderWishlistPage() {
  const items   = window.Wishlist?.getItems() || [];
  const grid    = $('wishlist-grid');
  const empty   = $('wishlist-view-empty');
  const foot    = $('wishlist-view-foot');
  const countEl = $('wishlist-page-count');
  if (!grid) return;

  if (countEl) countEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;

  if (items.length === 0) {
    empty?.removeAttribute('hidden');
    if (foot) foot.hidden = true;
    grid.innerHTML = '';
    return;
  }

  empty?.setAttribute('hidden', '');
  if (foot) foot.hidden = false;

  grid.innerHTML = '';
  items.forEach((item, i) => grid.appendChild(buildWishlistCard(item, i)));

  // Wire AI chips
  $('wishlist-view-foot')?.querySelectorAll('.wishlist-ai-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      window.AuraChat?.open(chip.dataset.prompt);
    });
  });
}

function buildWishlistCard(item, index) {
  const savePct = item.originalPrice
    ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
    : null;

  const div = document.createElement('div');
  div.className = 'wishlist-card';
  div.setAttribute('role', 'listitem');
  div.style.animationDelay = `${index * 0.05}s`;

  div.innerHTML = `
    <div class="wishlist-card__visual" style="background:${item.gradient}">
      ${savePct ? `<span class="wishlist-card__discount">−${savePct}%</span>` : ''}
    </div>
    <div class="wishlist-card__body">
      <div class="wishlist-card__name">${item.name}</div>
      <div class="wishlist-card__tagline">${item.tagline || ''}</div>
      <div class="wishlist-card__rating">★ <span>${item.rating}</span></div>
      <div class="wishlist-card__pricing">
        <span class="wishlist-card__price">$${item.price}</span>
        ${item.originalPrice ? `<span class="wishlist-card__original">$${item.originalPrice}</span>` : ''}
      </div>
      <div class="wishlist-card__actions">
        <button class="wishlist-card__add" data-add-id="${item.id}">Add to cart</button>
        <button class="wishlist-card__remove" data-rm-id="${item.id}" aria-label="Remove from wishlist">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--c-peach)" stroke="var(--c-peach)" stroke-width="1.5" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  div.querySelector('.wishlist-card__add').addEventListener('click', e => {
    e.stopPropagation();
    window.Cart?.addItem(item);
    const btn = e.currentTarget;
    btn.textContent = 'Added ✓';
    btn.classList.add('added');
    setTimeout(() => { btn.textContent = 'Add to cart'; btn.classList.remove('added'); }, 1800);
  });

  div.querySelector('.wishlist-card__remove').addEventListener('click', e => {
    e.stopPropagation();
    window.Wishlist?.removeItem(item.id);
  });

  div.addEventListener('click', e => {
    if (e.target.closest('.wishlist-card__add') || e.target.closest('.wishlist-card__remove')) return;
    state.wishlistReturnView = true;
    navigateTo('product', { productId: item.id });
  });

  return div;
}

/* ── Catalog View ────────────────────────────────────────────── */
const catalogState = {
  allProducts:    [],
  filtered:       [],
  compareIds:     new Set(),
  activeCategory: 'all',
  sortBy:         'default',
  query:          '',
};

async function loadCatalog() {
  showAIThinking('Loading catalog');
  try {
    const data = await window.LocalAPI.getProducts({ limit: 100 });
    catalogState.allProducts = data.products;
    applyCatalogFilters();
  } catch (e) { console.error(e); }
  finally { hideAIThinking(); }
}

function applyCatalogFilters() {
  let list = [...catalogState.allProducts];

  // Category filter
  if (catalogState.activeCategory !== 'all') {
    // "Gifting" is a meta-filter: products with giftSuitability ≥ 85
    if (catalogState.activeCategory === 'Gifting') {
      list = list.filter(p => p.aiHints?.giftSuitability >= 85);
    } else {
      list = list.filter(p => p.category === catalogState.activeCategory);
    }
  }

  // Search filter
  if (catalogState.query.trim()) {
    const q = catalogState.query.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  // Sort
  switch (catalogState.sortBy) {
    case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
    case 'price-desc': list.sort((a, b) => b.price - a.price); break;
    case 'rating':     list.sort((a, b) => b.rating - a.rating); break;
    case 'reviews':    list.sort((a, b) => b.reviews - a.reviews); break;
    default: break;
  }

  catalogState.filtered = list;

  const countEl = $('catalog-count');
  if (countEl) countEl.textContent = `${list.length} item${list.length !== 1 ? 's' : ''}`;

  renderCatalogGrid(list);
}

function renderCatalogGrid(products) {
  const grid = $('catalog-grid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="catalog-empty">
        <h3>No products found</h3>
        <p>Try a different filter or search term</p>
      </div>`;
    return;
  }

  grid.innerHTML = '';
  products.forEach((p, i) => {
    const card = buildCatalogCard(p, i);
    grid.appendChild(card);
  });
}

function buildCatalogCard(p, index) {
  const savePct = p.originalPrice ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : null;
  const isComparing = catalogState.compareIds.has(p.id);

  const div = document.createElement('div');
  div.className  = `cat-card${isComparing ? ' comparing' : ''}`;
  div.dataset.id = p.id;
  div.setAttribute('role', 'listitem');
  div.style.animationDelay = `${index * 0.05}s`;

  div.innerHTML = `
    <div class="cat-card__img">
      <div class="cat-card__img-inner" style="background:${p.gradient}"></div>
      ${p.badge ? `<span class="cat-card__badge">${p.badge}</span>` : ''}
      ${savePct ? `<span class="cat-card__discount">−${savePct}%</span>` : ''}
      <button class="cat-card__check${isComparing ? ' checked' : ''}"
              data-check-id="${p.id}" title="Compare" aria-label="Add to comparison">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>
    </div>
    <div class="cat-card__body">
      <div class="cat-card__cat">${p.category}</div>
      <div class="cat-card__name">${p.name}</div>
      <div class="cat-card__tagline">${p.tagline}</div>
      <div class="cat-card__rating">
        <span class="cat-card__stars">${starsHTML(p.rating)}</span>
        <span class="cat-card__review-count">${p.rating} (${p.reviews.toLocaleString()})</span>
      </div>
      <div class="cat-card__pricing">
        <span class="cat-card__price">$${p.price}</span>
        ${p.originalPrice ? `<span class="cat-card__original">$${p.originalPrice}</span>` : ''}
      </div>
      <div class="cat-card__ai-hint">${p.aiHints?.moodMatch || 'AI curated pick'}</div>
      <button class="cat-card__add-btn" data-add-id="${p.id}">Add to cart</button>
    </div>
  `;

  // Inject heart button
  const imgArea = div.querySelector('.cat-card__img');
  if (imgArea && window.Wishlist) {
    imgArea.appendChild(window.Wishlist.createHeartBtn(p));
  }

  // Open product detail
  div.addEventListener('click', e => {
    if (e.target.closest('.cat-card__check') ||
        e.target.closest('.cat-card__add-btn') ||
        e.target.closest('.heart-btn')) return;
    state.catalogReturnView = true;
    navigateTo('product', { productId: p.id });
  });

  // Add to cart
  div.querySelector('.cat-card__add-btn').addEventListener('click', e => {
    e.stopPropagation();
    window.Cart?.addItem(p);
    const btn = e.currentTarget;
    btn.textContent = 'Added ✓';
    btn.classList.add('added');
    setTimeout(() => { btn.textContent = 'Add to cart'; btn.classList.remove('added'); }, 1800);
  });

  // Compare toggle
  div.querySelector('.cat-card__check').addEventListener('click', e => {
    e.stopPropagation();
    toggleCatalogCompare(p.id, div);
  });

  return div;
}

function toggleCatalogCompare(id, cardEl) {
  const btn = cardEl?.querySelector('.cat-card__check');
  if (catalogState.compareIds.has(id)) {
    catalogState.compareIds.delete(id);
    btn?.classList.remove('checked');
    cardEl?.classList.remove('comparing');
  } else {
    if (catalogState.compareIds.size >= 3) {
      const first = [...catalogState.compareIds][0];
      catalogState.compareIds.delete(first);
      const firstCard = $('catalog-grid')?.querySelector(`.cat-card[data-id="${first}"]`);
      firstCard?.querySelector('.cat-card__check')?.classList.remove('checked');
      firstCard?.classList.remove('comparing');
    }
    catalogState.compareIds.add(id);
    btn?.classList.add('checked');
    cardEl?.classList.add('comparing');
  }
  updateComparePopup();
}

function initCatalogEvents() {
  // Logo → catalog (home)
  // No "back to entry" from catalog — catalog IS home

  // "Discover by mood" button → entry screen
  $('catalog-mood-btn')?.addEventListener('click', () => navigateTo('entry'));
  // Back from entry → catalog
  $('back-entry-to-catalog')?.addEventListener('click', () => navigateTo('catalog'));
  // "Browse all products" button in entry → catalog
  $('entry-catalog-btn')?.addEventListener('click', () => navigateTo('catalog'));

  // Category filters
  $('catalog-filters')?.addEventListener('click', e => {
    const btn = e.target.closest('.catalog-filter');
    if (!btn) return;
    document.querySelectorAll('.catalog-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    catalogState.activeCategory = btn.dataset.cat;
    applyCatalogFilters();
  });

  // Sort
  $('catalog-sort')?.addEventListener('change', e => {
    catalogState.sortBy = e.target.value;
    applyCatalogFilters();
  });

  // Search (debounced)
  let searchTimer;
  $('catalog-search-input')?.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      catalogState.query = e.target.value;
      applyCatalogFilters();
    }, 250);
  });

}

/* ── Store Finder ────────────────────────────────────────────── */
async function openStoreFinder() {
  const modal = $('store-modal');
  if (!modal) return;
  show(modal);
  modal.removeAttribute('hidden');

  try {
    const data = await window.LocalAPI.getStores();
    renderStoreFinder(data.stores);
  } catch (e) { console.error(e); }
}

function renderStoreFinder(stores) {
  const pins = $('store-map-pins');
  const list = $('store-list');
  if (!pins || !list) return;

  pins.innerHTML = stores.map(s => `
    <div class="store-pin ${s.open ? '' : 'closed'}"
         style="left:${s.x}%;top:${s.y}%;"
         title="${s.name}">
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

  list.querySelectorAll('.store-card__select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      hide($('store-modal'));
      showCheckoutConfirmation();
    });
  });
}

function showCheckoutConfirmation() {
  showAIThinking('Store pickup reserved');
  setTimeout(() => hideAIThinking(), 2000);
}

/* ── Particles (entry background) ───────────────────────────── */
function initParticles() {
  const canvas = $('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let particles = [];
  const resize = () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 70; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.5 + 0.1,
    });
  }

  const colors = ['109,41,50', '86,28,36', '155,68,85', '199,183,163'];

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      const color = colors[Math.floor(Math.random() * colors.length) % colors.length];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},${p.a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ── Event Wiring ────────────────────────────────────────────── */
function initEvents() {
  // Back buttons
  $('back-to-entry')  ?.addEventListener('click', () => navigateTo('entry'));
  $('back-to-explore')?.addEventListener('click', () => {
    if (state.wishlistReturnView) {
      state.wishlistReturnView = false;
      navigateTo('wishlist');
    } else if (state.catalogReturnView) {
      state.catalogReturnView = false;
      navigateTo('catalog');
    } else {
      navigateTo('explore');
    }
  });
  $('back-wishlist')?.addEventListener('click', () => {
    const prev = state.currentMood ? 'explore' : 'catalog';
    navigateTo(prev);
  });
  $('nav-logo')?.addEventListener('click', () => navigateTo('catalog'));
  $('wishlist-go-explore')?.addEventListener('click', () => navigateTo('catalog'));

  // Load more
  $('load-more-btn')?.addEventListener('click', loadMore);

  // Compare popup
  $('compare-popup-btn')?.addEventListener('click', openCompareFromPopup);
  $('compare-popup-clear')?.addEventListener('click', clearAllCompare);
  $('compare-close')?.addEventListener('click', () => hide($('compare-modal')));

  // Voice
  $('voice-btn')       ?.addEventListener('click', () => window.VoiceSearch?.open());
  $('entry-voice-btn') ?.addEventListener('click', () => window.VoiceSearch?.open());
  $('voice-close')     ?.addEventListener('click', () => window.VoiceSearch?.close());

  // Cart
  $('cart-btn')     ?.addEventListener('click', () => window.Cart?.openPanel());
  $('cart-close')   ?.addEventListener('click', () => window.Cart?.closePanel());
  $('cart-backdrop')?.addEventListener('click', () => window.Cart?.closePanel());

  // Store finder
  $('detail-pickup-btn')    ?.addEventListener('click', openStoreFinder);
  $('btn-store-checkout')   ?.addEventListener('click', openStoreFinder);
  $('cart-pickup-btn')      ?.addEventListener('click', openStoreFinder);
  $('catalog-map-btn')      ?.addEventListener('click', openStoreFinder);
  $('store-close')          ?.addEventListener('click', () => hide($('store-modal')));

  // Checkout → handled by checkout.js (navigates to view-checkout)

  // Close modals on backdrop click
  ['compare-modal', 'voice-overlay', 'store-modal'].forEach(id => {
    const el = $(id);
    el?.addEventListener('click', e => {
      if (e.target === el) hide(el);
    });
  });

  // Keyboard: Escape closes any open overlay
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    ['compare-modal', 'voice-overlay', 'store-modal'].forEach(id => hide($(id)));
    window.Cart?.closePanel();
    window.AuraChat?.close();
  });
}

/* ── Bootstrap ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initModeSwitcher();
  initParticles();
  initEvents();
  initCatalogEvents();

  // Load catalog on startup (catalog is the home page)
  loadCatalog();

  // Expose navigate globally for mood.js and voice.js
  window.App = {
    navigateTo,
    loadExplore,
    showAIThinking,
    hideAIThinking,
    starsHTML,
    renderWishlistPage,
    state,
  };
});
