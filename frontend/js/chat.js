/* ================================================================
   AURA — AI Chat
   Context-aware responses · product knowledge · wishlist/compare
================================================================ */
'use strict';

const AuraChat = (() => {

  // ── Context helpers ──────────────────────────────────────────
  function getContext() {
    return {
      mood:    window.App?.state?.currentMood || null,
      product: window.App?.state?.selectedProduct || null,
      wishlist: window.Wishlist?.getItems() || [],
      compareIds: [...(window.App?.state?.compareIds || [])],
    };
  }

  function getProductsFromAPI() {
    // Grab from LocalAPI product list (already loaded)
    return window.LOCAL_PRODUCTS_CACHE || [];
  }

  // ── Response engine ──────────────────────────────────────────
  async function generateResponse(userMsg, context) {
    const msg   = userMsg.toLowerCase().trim();
    const wl    = context.wishlist || [];
    const allP  = getProductsFromAPI();

    // ── Wishlist queries ────────────────────────────────────
    if (wl.length > 0 && /wishlist|saved|favorites?|list/i.test(msg)) {
      if (/first|buy|start|recommend/i.test(msg)) {
        const top = wl.reduce((a, b) => a.rating > b.rating ? a : b);
        return `Based on your wishlist, I'd start with <strong>${top.name}</strong> — it has the highest rating (${top.rating}★) and "${top.tagline}". It's the kind of thing that immediately changes your daily experience.`;
      }
      if (/value|cheap|price|money|worth/i.test(msg)) {
        const best = wl.reduce((a, b) => {
          const scoreA = a.originalPrice ? ((a.originalPrice - a.price) / a.originalPrice) : 0;
          const scoreB = b.originalPrice ? ((b.originalPrice - b.price) / b.originalPrice) : 0;
          return scoreA > scoreB ? a : b;
        });
        const pct = best.originalPrice ? Math.round(((best.originalPrice - best.price) / best.originalPrice) * 100) : null;
        return pct
          ? `The best value in your wishlist is <strong>${best.name}</strong> — it's currently ${pct}% off (was $${best.originalPrice}, now $${best.price}). That's a real saving.`
          : `<strong>${best.name}</strong> at $${best.price} gives you the most for your money from your saved items. ${wl.length > 1 ? "The others are quality picks too, but this one stands out on value." : ""}`;
      }
      if (/gift/i.test(msg)) {
        const gifty = wl.reduce((a, b) => (a.aiHints?.giftSuitability || 0) > (b.aiHints?.giftSuitability || 0) ? a : b);
        return `For gifting, <strong>${gifty.name}</strong> is your strongest pick from the wishlist — it has a ${gifty.aiHints?.giftSuitability}% gift suitability score. It's thoughtful, beautifully presented, and the kind of thing people remember receiving.`;
      }
      if (/compare|all|versus|vs/i.test(msg)) {
        if (wl.length < 2) return `You only have one item saved. Add a few more to your wishlist and I can give you a proper comparison!`;
        const sorted = [...wl].sort((a, b) => b.rating - a.rating);
        const lines = sorted.map(p => `• <strong>${p.name}</strong> — $${p.price}, ${p.rating}★ — "${p.tagline}"`).join('\n');
        const winner = sorted[0];
        return `Here's your wishlist ranked by rating:\n\n${lines}\n\nMy top pick for you right now: <strong>${winner.name}</strong>. ${winner.aiHints?.moodMatch || 'A solid choice.'}`;
      }
      // generic wishlist
      const names = wl.map(p => `<strong>${p.name}</strong>`).join(', ');
      return `You have ${wl.length} item${wl.length > 1 ? 's' : ''} saved: ${names}. Want me to help you compare them, find the best value, or suggest which to buy first?`;
    }

    // ── Compare queries ─────────────────────────────────────
    if (context.compareIds.length >= 2 && /compare|versus|vs|better|choose|which|pick/i.test(msg)) {
      const prods = allP.filter(p => context.compareIds.includes(p.id));
      if (prods.length >= 2) {
        const winner = prods.reduce((a, b) => a.rating > b.rating ? a : b);
        const names  = prods.map(p => p.name).join(' vs ');
        return `Looking at ${names}: <strong>${winner.name}</strong> edges ahead with a ${winner.rating}★ rating and ${winner.reviews} reviews. ${winner.reviewSummary?.insight || ''} If budget is a factor, I'm happy to dig deeper.`;
      }
    }

    // ── Mood / vibe ─────────────────────────────────────────
    if (/mood|vibe|feeling|energy|today|right now/i.test(msg)) {
      if (context.mood) {
        const moodMap = { treat:'treat yourself', focus:'focus', 'slow-sunday':'slow down', nostalgic:'feel nostalgic', gift:'find a gift', fresh:'start fresh' };
        const label = moodMap[context.mood] || context.mood;
        const moodProds = allP.filter(p => p.moods?.includes(context.mood)).slice(0, 3);
        const names = moodProds.map(p => `<strong>${p.name}</strong>`).join(', ');
        return `You're in "${label}" mode. The products that fit best right now are: ${names}. Want me to tell you more about any of these?`;
      }
      return `Tell me how you're feeling and I'll point you toward exactly the right thing. Something like "I need a treat" or "I want to slow down" — I'll take it from there.`;
    }

    // ── Budget ───────────────────────────────────────────────
    const budgetMatch = msg.match(/\$?(\d+)\s*(budget|dollars?|usd|spend)?/i);
    if (budgetMatch || /budget|afford|cheap|under|less than/i.test(msg)) {
      const budget = budgetMatch ? parseInt(budgetMatch[1]) : 80;
      const fits = allP.filter(p => p.price <= budget).sort((a, b) => b.rating - a.rating).slice(0, 3);
      if (fits.length === 0) return `Hmm, everything is above that budget. The closest is <strong>${allP.sort((a,b)=>a.price-b.price)[0]?.name}</strong> at $${allP.sort((a,b)=>a.price-b.price)[0]?.price}.`;
      const names = fits.map(p => `<strong>${p.name}</strong> ($${p.price})`).join(', ');
      return `Under $${budget} I'd look at: ${names}. The top-rated of those is <strong>${fits[0].name}</strong> — ${fits[0].reviewSummary?.insight || fits[0].tagline}.`;
    }

    // ── Gift queries ─────────────────────────────────────────
    if (/gift|present|someone|birthday|friend/i.test(msg)) {
      const gifty = [...allP].sort((a, b) => (b.aiHints?.giftSuitability || 0) - (a.aiHints?.giftSuitability || 0)).slice(0, 3);
      const top = gifty[0];
      return `The best gift picks right now are <strong>${gifty.map(p => p.name).join(', ')}</strong>. My first recommendation is <strong>${top.name}</strong> — ${top.aiHints?.giftSuitability}% gift score, beautiful packaging, and "${top.tagline}". Hard to go wrong.`;
    }

    // ── Specific product mentioned ───────────────────────────
    const mentioned = allP.find(p => msg.includes(p.name.toLowerCase()));
    if (mentioned) {
      return `<strong>${mentioned.name}</strong> — ${mentioned.tagline}. It's ${mentioned.rating}★ from ${mentioned.reviews} reviews. Key insight: "${mentioned.reviewSummary?.insight}". ${mentioned.reviewSummary?.pros?.[0] ? `People love that it "${mentioned.reviewSummary.pros[0]}".` : ''} Want me to compare it with something?`;
    }

    // ── Current product context ──────────────────────────────
    if (context.product && /this|it|this one|current|here/i.test(msg)) {
      const p = context.product;
      return `<strong>${p.name}</strong> is a ${p.rating}★ pick. "${p.reviewSummary?.insight}". ${p.originalPrice ? `It's currently $${p.price} (was $${p.originalPrice}).` : `It's $${p.price}.`} ${p.reviewSummary?.pros?.[0] ? `Biggest plus: "${p.reviewSummary.pros[0]}".` : ''} Worth it?`;
    }

    // ── Greetings / small talk ───────────────────────────────
    if (/hello|hi|hey|what can you|help|who are you/i.test(msg)) {
      const names = wl.length > 0 ? ` You have ${wl.length} item${wl.length > 1 ? 's' : ''} saved.` : '';
      return `Hi! I'm your Aura AI assistant.${names} I can help you: find the right product for your mood, compare items, check what's worth buying, find the best gift, or talk through anything in your wishlist. What's on your mind?`;
    }

    // ── Focus / productivity ─────────────────────────────────
    if (/focus|work|study|productive|concentrate/i.test(msg)) {
      const focusProds = allP.filter(p => p.moods?.includes('focus')).slice(0, 2);
      return `For focus, the two I'd point you toward are <strong>${focusProds.map(p=>p.name).join('</strong> and <strong>')}</strong>. Together they create an environment that makes deep work feel effortless. The ${focusProds[0]?.name} in particular has ${focusProds[0]?.reviewSummary?.pros?.[0]?.toLowerCase() || 'rave reviews'}.`;
    }

    // ── Fallback ─────────────────────────────────────────────
    const fallbacks = [
      `I can help with that! Try asking me something like "what's the best value on my wishlist?" or "I have a $60 budget" or "I need a gift for a friend."`,
      `Good question. To give you the best answer, could you tell me a bit more — like what mood you're in, or what you're looking for?`,
      `I'm thinking... Tell me more. Are you looking for something for yourself, or as a gift? Do you have a budget in mind?`,
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  // ── UI helpers ───────────────────────────────────────────────
  function scrollToBottom() {
    const el = document.getElementById('ai-chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function appendMessage(role, text) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-msg chat-msg--${role}`;
    div.innerHTML = `
      <div class="chat-msg__avatar">${role === 'ai' ? '✦' : 'You'}</div>
      <div class="chat-msg__bubble">${text.replace(/\n/g, '<br>')}</div>
    `;
    container.appendChild(div);
    scrollToBottom();
  }

  function showTyping() {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chat-msg chat-msg--ai';
    div.id = 'chat-typing-indicator';
    div.innerHTML = `
      <div class="chat-msg__avatar">✦</div>
      <div class="chat-typing">
        <div class="chat-typing-dot"></div>
        <div class="chat-typing-dot"></div>
        <div class="chat-typing-dot"></div>
      </div>
    `;
    container.appendChild(div);
    scrollToBottom();
  }

  function hideTyping() {
    document.getElementById('chat-typing-indicator')?.remove();
  }

  function setSending(on) {
    const btn = document.getElementById('ai-chat-send');
    const inp = document.getElementById('ai-chat-input');
    if (btn) btn.disabled = on;
    if (inp) inp.disabled = on;
  }

  // ── Context label in header ──────────────────────────────────
  function updateContextLabel() {
    const el = document.getElementById('chat-context-label');
    if (!el) return;
    const wl = window.Wishlist?.getItems() || [];
    const ctx = window.App?.state;
    if (wl.length > 0) {
      el.textContent = `${wl.length} saved`;
    } else if (ctx?.currentMoodLabel) {
      el.textContent = ctx.currentMoodLabel;
    } else {
      el.textContent = '';
    }
    el.style.display = el.textContent ? '' : 'none';
  }

  // ── Suggestion chips ─────────────────────────────────────────
  function renderSuggestions() {
    const container = document.getElementById('ai-chat-suggestions');
    if (!container) return;

    const ctx = getContext();
    const chips = [];

    if (ctx.wishlist.length >= 2) {
      chips.push('Which should I buy first?', 'Best value in my wishlist?');
    } else if (ctx.wishlist.length === 1) {
      chips.push(`Tell me about ${ctx.wishlist[0].name}`, 'Best gift under $100?');
    } else {
      chips.push('Best gift under $100?', "What's good for focus?", 'Cozy picks for the weekend');
    }
    if (ctx.compareIds.length >= 2) chips.unshift('Compare my selected items');

    container.innerHTML = chips.map(c =>
      `<button class="chat-suggestion" data-q="${c}">${c}</button>`
    ).join('');

    container.querySelectorAll('.chat-suggestion').forEach(btn => {
      btn.addEventListener('click', () => send(btn.dataset.q));
    });
  }

  // ── Send a message ───────────────────────────────────────────
  async function send(text) {
    const val = (text || document.getElementById('ai-chat-input')?.value || '').trim();
    if (!val) return;

    const input = document.getElementById('ai-chat-input');
    if (input) input.value = '';

    appendMessage('user', val);
    setSending(true);
    showTyping();

    const delay = 600 + Math.random() * 600;
    await new Promise(r => setTimeout(r, delay));

    const ctx = getContext();
    const reply = await generateResponse(val, ctx);

    hideTyping();
    appendMessage('ai', reply);
    setSending(false);
    renderSuggestions();
  }

  // ── Open / Close ─────────────────────────────────────────────
  function open(initialPrompt) {
    const panel = document.getElementById('ai-chat-panel');
    const backdrop = document.getElementById('ai-chat-backdrop');
    if (!panel) return;

    panel.classList.add('open');
    if (backdrop) backdrop.classList.add('visible');

    updateContextLabel();
    renderSuggestions();

    // Greet on first open
    const msgs = document.getElementById('ai-chat-messages');
    if (msgs && msgs.children.length === 0) {
      const wl = window.Wishlist?.getItems() || [];
      const greeting = wl.length > 0
        ? `Hi! I see you have ${wl.length} item${wl.length > 1 ? 's' : ''} in your wishlist. Want me to help you decide which to buy, compare them, or find something that pairs well?`
        : `Hi! I'm your Aura AI assistant. Ask me anything — "what's best for focus?", "I have a $60 budget", "find me a gift" — I'll find the right answer.`;
      appendMessage('ai', greeting);
    }

    if (initialPrompt) {
      setTimeout(() => send(initialPrompt), 300);
    }

    setTimeout(() => document.getElementById('ai-chat-input')?.focus(), 400);
  }

  function close() {
    document.getElementById('ai-chat-panel')?.classList.remove('open');
    document.getElementById('ai-chat-backdrop')?.classList.remove('visible');
  }

  // ── Init ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // FAB
    document.getElementById('ask-ai-fab')?.addEventListener('click', () => open());

    // Close
    document.getElementById('ai-chat-close')?.addEventListener('click', close);
    document.getElementById('ai-chat-backdrop')?.addEventListener('click', close);

    // Send on Enter / button
    const input = document.getElementById('ai-chat-input');
    input?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    document.getElementById('ai-chat-send')?.addEventListener('click', () => send());
  });

  return { open, close, send, appendMessage, updateContextLabel };
})();

window.AuraChat = AuraChat;

// Make LOCAL_PRODUCTS_CACHE available for AI context
document.addEventListener('DOMContentLoaded', () => {
  if (window.LocalAPI) {
    window.LocalAPI.getProducts({ limit: 50 }).then(d => {
      window.LOCAL_PRODUCTS_CACHE = d.products || [];
    });
  }
});
