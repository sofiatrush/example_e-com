/* ================================================================
   AURA — Ambient AI Layer
   Contextual hints · staggered reveal · product detail enrichment
================================================================ */

'use strict';

(function () {

  // ── Card hover AI hints (ambient, non-intrusive) ─────────────
  function initCardHints() {
    // Delegated — works for dynamically rendered cards too
    document.addEventListener('mouseenter', e => {
      const card = e.target.closest('.product-card');
      if (!card) return;
      revealCardHints(card);
    }, true);

    document.addEventListener('mouseleave', e => {
      const card = e.target.closest('.product-card');
      if (!card) return;
    }, true);
  }

  function revealCardHints(card) {
    const hints = card.querySelectorAll('.card-ai-hint');
    hints.forEach((hint, i) => {
      hint.style.transitionDelay = `${i * 60}ms`;
    });
  }

  // ── Product detail AI hints — stagger in on page load ────────
  function revealDetailHints(delay = 600) {
    const layer = document.getElementById('detail-ai-hints');
    if (!layer) return;

    const hints = layer.querySelectorAll('.ai-hint');
    hints.forEach((hint, i) => {
      setTimeout(() => {
        hint.style.opacity   = '1';
        hint.style.transform = 'translateX(0)';
      }, delay + i * 180);
    });
  }

  // Patch into app.js renderProductDetail
  const _orig = window.__detailRendered;
  const observer = new MutationObserver(() => {
    const nameEl = document.getElementById('detail-name');
    if (nameEl && nameEl.textContent) {
      revealDetailHints(500);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const layer = document.getElementById('detail-ai-hints');
    if (layer) {
      // Initial state: hidden, offset left
      layer.querySelectorAll('.ai-hint').forEach(h => {
        h.style.opacity   = '0';
        h.style.transform = 'translateX(-10px)';
        h.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      });

      // Watch for name changes (triggered by renderProductDetail)
      const nameEl = document.getElementById('detail-name');
      if (nameEl) {
        observer.observe(nameEl, { childList: true, characterData: true, subtree: true });
      }
    }

    initCardHints();
    initReviewAnimation();
    initCompareCardHighlight();
  });

  // ── AI Review card — animate pros/cons in when visible ───────
  function initReviewAnimation() {
    const reviewCard = document.getElementById('ai-review-card');
    if (!reviewCard) return;

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateReviewItems();
        io.disconnect();
      });
    }, { threshold: 0.2 });

    io.observe(reviewCard);
  }

  function animateReviewItems() {
    const items = document.querySelectorAll('#pros-list li, #cons-list li');
    items.forEach((item, i) => {
      item.style.opacity   = '0';
      item.style.transform = 'translateX(-8px)';
      item.style.transition = `opacity 0.35s ease ${i * 80}ms, transform 0.35s ease ${i * 80}ms`;
      setTimeout(() => {
        item.style.opacity   = '1';
        item.style.transform = 'translateX(0)';
      }, 50);
    });
  }

  // ── Comparison modal — highlight winner card ──────────────────
  function initCompareCardHighlight() {
    // Called after verdict renders; delegated mutation approach
    const verdict = document.getElementById('verdict-results');
    if (!verdict) return;

    new MutationObserver(() => {
      const winnerName = verdict.querySelector('.best-for-you')?.parentElement?.querySelector('.verdict-card__name')?.textContent;
      if (!winnerName) return;

      document.querySelectorAll('.compare-product-card').forEach(card => {
        const name = card.querySelector('.compare-product-card__name')?.textContent;
        if (name === winnerName) {
          card.classList.add('winner');
          card.style.transform = 'translateY(-4px)';
        }
      });
    }).observe(verdict, { childList: true, subtree: true });
  }

  // ── Floating AI badge on product cards (subtle indicator) ────
  // Shows a small pulsing dot on cards that match the current mood strongly
  function decorateHighRelevanceCards(products, mood) {
    if (!products || !mood) return;
    products.forEach(p => {
      if (!p.moods?.includes(mood)) return;
      const card = document.querySelector(`.product-card[data-id="${p.id}"]`);
      if (!card) return;
      // Add a subtle glow border for high-relevance items
      if (p.aiHints?.giftScore >= 90 || p.badge === 'Bestseller' || p.badge === 'Community Favorite') {
        card.style.boxShadow = '0 0 0 1px var(--c-purple-lo), 0 2px 20px rgba(0,0,0,0.2)';
      }
    });
  }

  // Expose for app.js usage
  window.AILayer = {
    revealDetailHints,
    decorateHighRelevanceCards,
    animateReviewItems,
  };

})();
