/* ================================================================
   AURA — Local API  (runs entirely in the browser, no backend)
   Mirrors the Express routes so the rest of the app is unchanged
================================================================ */

'use strict';

const LOCAL_PRODUCTS = [
  {
    id: 1, name: "Luminary Candle Set",
    tagline: "For moments that deserve soft light",
    price: 45, originalPrice: 68, category: "Wellness",
    moods: ["treat", "slow-sunday", "nostalgic"],
    gradient: "linear-gradient(135deg,#f093fb 0%,#f5576c 50%,#fda085 100%)",
    rating: 4.9, reviews: 312, badge: "Bestseller",
    aiHints: { moodMatch: "Perfect for unwinding after a long week", giftSuitability: 95, behavioral: "People who browsed this also loved our silk collection" },
    reviewSummary: { pros: ["Incredibly long burn time","Non-toxic soy wax","The scent fills the whole room"], cons: ["Glass jars are heavy to ship"], insight: "Best gifted as a set — customers say the three scents tell a story together.", peopleLikeYou: "88% of buyers were treating themselves after a stressful month" },
    complementary: [7, 8]
  },
  {
    id: 2, name: "Cloud Body Butter",
    tagline: "Skin so soft, you'll forget the world",
    price: 38, originalPrice: 52, category: "Skincare",
    moods: ["treat","slow-sunday"],
    gradient: "linear-gradient(135deg,#e0c3fc 0%,#8ec5fc 50%,#fbc2eb 100%)",
    rating: 4.8, reviews: 189, badge: "Staff Pick",
    aiHints: { moodMatch: "Made for slow mornings and self-care rituals", giftSuitability: 88, behavioral: "Matches your interest in mindful wellness" },
    reviewSummary: { pros: ["Absorbs without greasiness","Lasts all day","Subtle, beautiful scent"], cons: ["Jar could be larger for the price"], insight: "Night routine game-changer. Most users report noticeably softer skin within 3 days.", peopleLikeYou: "91% of buyers use it as part of a weekly self-care routine" },
    complementary: [1, 3]
  },
  {
    id: 3, name: "Silk Sleep Mask",
    tagline: "Where sleep becomes a ritual",
    price: 29, originalPrice: null, category: "Sleep",
    moods: ["treat","slow-sunday"],
    gradient: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
    rating: 4.7, reviews: 445, badge: "New Arrival",
    aiHints: { moodMatch: "Your sleep quality will thank you", giftSuitability: 78, behavioral: "Complementary to your self-care browsing" },
    reviewSummary: { pros: ["Zero light leakage","Doesn't tangle hair","Cool to the touch"], cons: ["Strap could be adjustable"], insight: "Customers with insomnia call this genuinely life-changing.", peopleLikeYou: "73% are using it alongside other sleep routine products" },
    complementary: [1, 8]
  },
  {
    id: 4, name: "Clarity Tea Blend",
    tagline: "Your brain in bloom",
    price: 24, originalPrice: 32, category: "Focus",
    moods: ["focus","fresh"],
    gradient: "linear-gradient(135deg,#11998e 0%,#38ef7d 100%)",
    rating: 4.6, reviews: 201, badge: null,
    aiHints: { moodMatch: "Brewed for your best thinking", giftSuitability: 72, behavioral: "Popular among people who work from home" },
    reviewSummary: { pros: ["Subtle caffeine lift, no jitters","Organic ingredients","Calming aroma while working"], cons: ["Strong taste might need honey"], insight: "Users report 2–3 hour focus windows after brewing. Works best mid-morning.", peopleLikeYou: "82% are knowledge workers or students" },
    complementary: [5, 9]
  },
  {
    id: 5, name: "Deep Focus Sound Dome",
    tagline: "The world falls away",
    price: 79, originalPrice: 110, category: "Productivity",
    moods: ["focus"],
    gradient: "linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)",
    rating: 4.8, reviews: 156, badge: "Top Rated",
    aiHints: { moodMatch: "Designed for deep work sessions", giftSuitability: 82, behavioral: "Other buyers paired this with the tea collection" },
    reviewSummary: { pros: ["Pink noise + binaural option","Sleek minimal design","USB-C charging"], cons: ["App could use more sound profiles"], insight: "Users average 40% longer focus blocks with this device.", peopleLikeYou: "67% report it significantly reduced distractions within the first week" },
    complementary: [4, 6]
  },
  {
    id: 6, name: "Bamboo Desk Edit",
    tagline: "A clear space, a clear mind",
    price: 52, originalPrice: null, category: "Organization",
    moods: ["focus","fresh"],
    gradient: "linear-gradient(135deg,#a8edea 0%,#fed6e3 100%)",
    rating: 4.5, reviews: 88, badge: null,
    aiHints: { moodMatch: "Transform your workspace instantly", giftSuitability: 70, behavioral: "Popular with your professional demographic" },
    reviewSummary: { pros: ["Sustainable bamboo","Holds more than expected","No assembly required"], cons: ["Limited color options"], insight: "The physical act of organizing triggers a mental reset for most users.", peopleLikeYou: "79% noticed improved focus after decluttering their desk" },
    complementary: [4, 5]
  },
  {
    id: 7, name: "Sunrise Diffuser Kit",
    tagline: "Mornings that feel like magic",
    price: 89, originalPrice: 125, category: "Home",
    moods: ["slow-sunday","fresh"],
    gradient: "linear-gradient(135deg,#f7971e 0%,#ffd200 100%)",
    rating: 4.9, reviews: 534, badge: "Bestseller",
    aiHints: { moodMatch: "Transforms your space into a sanctuary", giftSuitability: 94, behavioral: "Matches your slow-living preferences" },
    reviewSummary: { pros: ["Runs 8 hours on low","Timer function is excellent","Oils included are premium quality"], cons: ["Light setting could be dimmer"], insight: "Used by 70% of buyers as part of a morning ritual.", peopleLikeYou: "85% use it every single morning within 2 weeks of purchase" },
    complementary: [1, 8]
  },
  {
    id: 8, name: "Weighted Dream Blanket",
    tagline: "Held, always",
    price: 120, originalPrice: 165, category: "Comfort",
    moods: ["slow-sunday","treat"],
    gradient: "linear-gradient(135deg,#2c3e50 0%,#4ca1af 100%)",
    rating: 4.9, reviews: 721, badge: "Community Favorite",
    aiHints: { moodMatch: "The most requested product for self-care days", giftSuitability: 90, behavioral: "Aligns with your interest in wellness products" },
    reviewSummary: { pros: ["15lbs feels just right","Cooling cotton cover included","Anxiety relief is real"], cons: ["Takes a few nights to adjust to the weight"], insight: "9 in 10 users say they sleep better with it.", peopleLikeYou: "78% bought this during a period of high stress" },
    complementary: [1, 3]
  },
  {
    id: 9, name: "Pour-Over Coffee Ritual",
    tagline: "Slow down. Pour carefully. Taste everything.",
    price: 65, originalPrice: 80, category: "Kitchen",
    moods: ["slow-sunday","focus","nostalgic"],
    gradient: "linear-gradient(135deg,#6a3093 0%,#a044ff 50%,#ec407a 100%)",
    rating: 4.7, reviews: 298, badge: null,
    aiHints: { moodMatch: "For people who believe in the ritual as much as the result", giftSuitability: 86, behavioral: "Often chosen by mindful, intentional shoppers" },
    reviewSummary: { pros: ["Heat-resistant borosilicate glass","Kit includes everything","Makes mornings feel intentional"], cons: ["Learning curve for first-timers"], insight: "The slowdown is the point. Users say the 5-minute ritual sets the tone for the whole day.", peopleLikeYou: "91% consider themselves coffee ritual enthusiasts" },
    complementary: [4, 1]
  },
  {
    id: 10, name: "Instax Mini Camera",
    tagline: "Keep the moments you love",
    price: 95, originalPrice: null, category: "Photography",
    moods: ["nostalgic","gift"],
    gradient: "linear-gradient(135deg,#f6d365 0%,#fda085 100%)",
    rating: 4.8, reviews: 892, badge: "Gift Favorite",
    aiHints: { moodMatch: "Perfect for capturing analog memories in a digital world", giftSuitability: 97, behavioral: "Top choice for gift-givers and memory-keepers" },
    reviewSummary: { pros: ["Instant gratification is addictive","Film quality is beautiful","Everyone wants to use it"], cons: ["Film refills can add up"], insight: "Consistently the top-reviewed gift item. Creates real connection between people.", peopleLikeYou: "83% bought this as a gift for someone they love" },
    complementary: [12, 11]
  },
  {
    id: 11, name: "Vinyl Revival Player",
    tagline: "Sound the way it was meant to be heard",
    price: 149, originalPrice: 199, category: "Audio",
    moods: ["nostalgic","slow-sunday"],
    gradient: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#7f5af0 100%)",
    rating: 4.7, reviews: 423, badge: "Premium",
    aiHints: { moodMatch: "For those who believe better things take time", giftSuitability: 92, behavioral: "Chosen by people who value quality over convenience" },
    reviewSummary: { pros: ["Warm, rich analog sound","Built-in Bluetooth","Stunning design piece"], cons: ["Setup takes 30 minutes but is worth it"], insight: "People who buy this say it changed how they listen to music.", peopleLikeYou: "76% also own or recently purchased vinyl records" },
    complementary: [9, 8]
  },
  {
    id: 12, name: "Leather Memory Journal",
    tagline: "Write the story you'll want to remember",
    price: 34, originalPrice: 48, category: "Stationery",
    moods: ["nostalgic","fresh","treat"],
    gradient: "linear-gradient(135deg,#c79081 0%,#dfa579 100%)",
    rating: 4.8, reviews: 677, badge: null,
    aiHints: { moodMatch: "For reflective souls and future archaeologists", giftSuitability: 85, behavioral: "Popular with people in transitional life moments" },
    reviewSummary: { pros: ["Genuine leather ages beautifully","Paper quality is exceptional","Perfect binding lays flat"], cons: ["Pen loop is a bit tight initially"], insight: "Customers call it a 'companion'. Many have bought multiple as they fill them.", peopleLikeYou: "65% started journaling for the first time after buying this" },
    complementary: [10, 11]
  }
];

const LOCAL_STORES = [
  { id:1, name:"Aura Flagship",  address:"Khreshchatyk 22",       distance:"0.8 km", open:true,  hours:"10:00 – 21:00", x:55, y:45 },
  { id:2, name:"Aura Studio",    address:"Velyka Vasylkivska 55", distance:"1.4 km", open:true,  hours:"09:00 – 20:00", x:30, y:65 },
  { id:3, name:"Aura Express",   address:"Peremohy Ave 12",       distance:"2.1 km", open:false, hours:"11:00 – 22:00", x:70, y:30 }
];

const MOOD_KEYWORDS = {
  treat:         ['treat','reward','indulge','deserve','pamper','luxury','splurge','myself'],
  focus:         ['focus','concentrate','work','productive','study','think','clear','busy','distracted'],
  'slow-sunday': ['slow','relax','cozy','chill','lazy','peaceful','quiet','rest','sunday','morning','calm'],
  nostalgic:     ['nostalgic','memory','vintage','old','remember','past','classic','retro','warm'],
  gift:          ['gift','present','friend','birthday','someone','give','surprise','them'],
  fresh:         ['fresh','new','start','change','energy','begin','reset','motivation','today']
};

const MOOD_LABELS = {
  treat:'Need a treat', focus:"Can't focus",
  'slow-sunday':'Slow Sunday', nostalgic:'Feeling nostalgic',
  gift:'Planning a gift', fresh:'Fresh start'
};

const MOOD_INTERPRETATIONS = {
  treat:         "I hear you — you deserve something special. Here's what I found.",
  focus:         "Let's create the perfect environment for deep focus.",
  'slow-sunday': "Taking it slow? I've curated the perfect slow-down selection.",
  nostalgic:     "Let's bring back those warm feelings with these picks.",
  gift:          "Finding the perfect gift is easy when AI knows your taste.",
  fresh:         "Ready for something new? These will help you step forward."
};

function detectMood(query) {
  const lower = query.toLowerCase();
  let best = null, bestScore = 0;
  for (const [mood, kws] of Object.entries(MOOD_KEYWORDS)) {
    const score = kws.filter(k => lower.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = mood; }
  }
  return best || 'slow-sunday';
}

function moodHint(product, mood) {
  const defaults = {
    treat:'Perfect for treating yourself', focus:'Helps you stay in the zone',
    'slow-sunday':'Made for slow, intentional moments', nostalgic:'Brings back those warm feelings',
    gift:"They'll absolutely love this", fresh:'Great for your new chapter'
  };
  return {
    moodMatch:      defaults[mood] || product.aiHints.moodMatch,
    giftSuitability: product.aiHints.giftSuitability,
    behavioral:     product.aiHints.behavioral
  };
}

function comparisonVerdict(prods) {
  const scored = prods.map(p => ({
    product:       p,
    valueScore:    p.originalPrice ? ((p.originalPrice - p.price) / p.originalPrice) * 100 : 40,
    moodScore:     p.rating * 18 + (p.reviews > 300 ? 10 : 0),
    personalScore: p.rating * 20 + (p.badge ? 8 : 0)
  }));
  const byYou   = scored.reduce((a,b) => a.personalScore > b.personalScore ? a : b).product;
  const byValue = scored.reduce((a,b) => a.valueScore   > b.valueScore    ? a : b).product;
  const byMood  = scored.reduce((a,b) => a.moodScore    > b.moodScore     ? a : b).product;
  return {
    bestForYou:  { id:byYou.id,   name:byYou.name,   reason:'Aligns best with your taste profile' },
    bestValue:   { id:byValue.id, name:byValue.name, reason:'Best price-to-quality ratio' },
    bestForMood: { id:byMood.id,  name:byMood.name,  reason:'Strongest match to your current mood' },
    summary:     `Based on your preferences, ${byYou.name} is the standout choice right now.`
  };
}

/* Simulated async delay */
const delay = ms => new Promise(r => setTimeout(r, ms));

/* ── Public API (mirrors the Express routes) ─────────────────── */
window.LocalAPI = {

  async getProducts({ mood, limit = 6, offset = 0 } = {}) {
    await delay(280);
    let filtered = mood
      ? LOCAL_PRODUCTS.filter(p => p.moods.includes(mood))
      : LOCAL_PRODUCTS;
    if (filtered.length === 0) filtered = LOCAL_PRODUCTS;
    const page = filtered.slice(offset, offset + limit);
    return {
      products: page.map(p => ({ ...p, aiHints: moodHint(p, mood || 'slow-sunday') })),
      total: filtered.length,
      mood
    };
  },

  async getProduct(id) {
    await delay(200);
    const p = LOCAL_PRODUCTS.find(p => p.id === id);
    if (!p) throw new Error('Not found');
    return {
      ...p,
      aiInsights: {
        ...p.reviewSummary,
        peopleAlsoBought: LOCAL_PRODUCTS
          .filter(x => p.complementary.includes(x.id))
          .map(({ id, name, price, gradient, rating }) => ({ id, name, price, gradient, rating }))
      }
    };
  },

  async searchIntent(query) {
    await delay(650);
    const mood = detectMood(query);
    let filtered = LOCAL_PRODUCTS.filter(p => p.moods.includes(mood));
    if (filtered.length === 0) filtered = LOCAL_PRODUCTS;
    return {
      detectedMood:   mood,
      moodLabel:      MOOD_LABELS[mood],
      products:       filtered.slice(0, 6),
      interpretation: MOOD_INTERPRETATIONS[mood] || "Here's what I found for you."
    };
  },

  async compare(productIds) {
    await delay(900);
    const prods = LOCAL_PRODUCTS.filter(p => productIds.includes(p.id));
    return { products: prods, verdict: comparisonVerdict(prods) };
  },

  async getStores() {
    await delay(100);
    return { stores: LOCAL_STORES };
  }
};
