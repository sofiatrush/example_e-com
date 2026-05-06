const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'products.json')));

// ── AI simulation logic ──────────────────────────────────────────

const MOOD_KEYWORDS = {
  treat:       ['treat', 'reward', 'indulge', 'deserve', 'pamper', 'luxury', 'splurge', 'myself'],
  focus:       ['focus', 'concentrate', 'work', 'productive', 'study', 'think', 'clear', 'busy', 'distracted'],
  'slow-sunday': ['slow', 'relax', 'cozy', 'chill', 'lazy', 'peaceful', 'quiet', 'rest', 'sunday', 'morning', 'calm'],
  nostalgic:   ['nostalgic', 'memory', 'vintage', 'old', 'remember', 'past', 'classic', 'retro', 'warm'],
  gift:        ['gift', 'present', 'friend', 'birthday', 'someone', 'give', 'surprise', 'them'],
  fresh:       ['fresh', 'new', 'start', 'change', 'energy', 'begin', 'reset', 'motivation', 'today']
};

const MOOD_LABELS = {
  treat: 'Need a treat',
  focus: "Can't focus",
  'slow-sunday': 'Slow Sunday',
  nostalgic: 'Feeling nostalgic',
  gift: 'Planning a gift',
  fresh: 'Fresh start'
};

const MOOD_INTERPRETATIONS = {
  treat:         "I hear you — you deserve something special. Here's what I think you'd love.",
  focus:         "Let's create the perfect focus environment for you.",
  'slow-sunday': "Taking it slow? I've curated the perfect slow-down selection.",
  nostalgic:     "Let's bring back those warm memories with these picks.",
  gift:          "Finding the perfect gift is hard — let me make it effortless.",
  fresh:         "Ready for something new? These will help you step into a fresh chapter."
};

function detectMood(query) {
  const lower = query.toLowerCase();
  let best = null, bestScore = 0;
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    const score = keywords.filter(k => lower.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = mood; }
  }
  return best || 'slow-sunday';
}

function moodHint(product, mood) {
  const defaults = {
    treat:         'Perfect for treating yourself',
    focus:         'Helps you stay in the zone',
    'slow-sunday': 'Made for slow, intentional moments',
    nostalgic:     'Brings back those warm feelings',
    gift:          "They'll absolutely love this",
    fresh:         'Great for your new chapter'
  };
  return {
    moodMatch:      defaults[mood] || product.aiHints.moodMatch,
    giftScore:      product.aiHints.giftSuitability,
    behavioralNote: product.aiHints.behavioral
  };
}

function comparisonVerdict(prods) {
  const scored = prods.map(p => ({
    product:       p,
    valueScore:    p.originalPrice ? ((p.originalPrice - p.price) / p.originalPrice) * 100 : 40,
    moodScore:     p.rating * 18 + (p.reviews > 300 ? 10 : 0),
    personalScore: p.rating * 20 + (p.badge ? 8 : 0)
  }));

  const byYou   = scored.reduce((a, b) => a.personalScore > b.personalScore ? a : b).product;
  const byValue = scored.reduce((a, b) => a.valueScore   > b.valueScore    ? a : b).product;
  const byMood  = scored.reduce((a, b) => a.moodScore    > b.moodScore     ? a : b).product;

  return {
    bestForYou:   { id: byYou.id,   name: byYou.name,   reason: 'Aligns best with your taste profile and rating history' },
    bestValue:    { id: byValue.id, name: byValue.name, reason: 'Best price-to-quality ratio of the selection' },
    bestForMood:  { id: byMood.id,  name: byMood.name,  reason: 'Strongest match to your current emotional context' },
    summary:      `Based on your preferences, ${byYou.name} is the standout choice right now.`
  };
}

// ── Routes ────────────────────────────────────────────────────────

// All products, optional mood filter
app.get('/api/products', (req, res) => {
  const { mood, limit = 6, offset = 0 } = req.query;
  let filtered = mood ? products.filter(p => p.moods.includes(mood)) : products;
  if (filtered.length === 0) filtered = products;

  const page    = filtered.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  const enriched = page.map(p => ({ ...p, aiHints: moodHint(p, mood || 'slow-sunday') }));

  setTimeout(() => res.json({ products: enriched, total: filtered.length, mood }), 250);
});

// Single product with full AI enrichment
app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Not found' });

  const enriched = {
    ...product,
    aiInsights: {
      ...product.reviewSummary,
      peopleAlsoBought: products
        .filter(p => product.complementary.includes(p.id))
        .map(({ id, name, price, gradient, rating }) => ({ id, name, price, gradient, rating }))
    }
  };

  setTimeout(() => res.json(enriched), 200);
});

// Intent-based search (voice / text)
app.post('/api/ai/intent', (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });

  const mood     = detectMood(query);
  let filtered   = products.filter(p => p.moods.includes(mood));
  if (filtered.length === 0) filtered = products;

  setTimeout(() => res.json({
    detectedMood:   mood,
    moodLabel:      MOOD_LABELS[mood],
    products:       filtered.slice(0, 6),
    interpretation: MOOD_INTERPRETATIONS[mood] || `Here's what I found for you.`
  }), 600);
});

// AI comparison
app.post('/api/ai/compare', (req, res) => {
  const { productIds } = req.body;
  if (!productIds || productIds.length < 2)
    return res.status(400).json({ error: 'Need at least 2 products' });

  const prods   = products.filter(p => productIds.includes(p.id));
  const verdict = comparisonVerdict(prods);

  setTimeout(() => res.json({ products: prods, verdict }), 900);
});

// Nearby stores
app.get('/api/stores', (_req, res) => {
  res.json({
    stores: [
      { id: 1, name: 'Aura Flagship',  address: 'Khreshchatyk 22',         distance: '0.8 km', open: true,  hours: '10:00 – 21:00', x: 55, y: 45 },
      { id: 2, name: 'Aura Studio',    address: 'Velyka Vasylkivska 55',    distance: '1.4 km', open: true,  hours: '09:00 – 20:00', x: 30, y: 65 },
      { id: 3, name: 'Aura Express',   address: 'Peremohy Ave 12',          distance: '2.1 km', open: false, hours: '11:00 – 22:00', x: 70, y: 30 }
    ]
  });
});

// Fallback SPA route
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✨  Aura Shop  →  http://localhost:${PORT}`);
});
