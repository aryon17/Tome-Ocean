/* ════════════════════════════════════════════════════════
   TomeOcean — Main Application
   ════════════════════════════════════════════════════════ */

// ── STATE ──────────────────────────────────────────────────────────────────
const S = {
  user: { name:'', genres:[], ratings:[], lists:[], readHistory:[], currentlyReading:[], wishlist:[] },
  recommender: null,
  view: 'hero',
  ratingTarget: null,
  addListTarget: null,
  searchFilter: null,
  onboardingStep: 0,
  onboardingRatings: {},
  activeMood: null,
  activeDialogues: {},
};

// ── STORAGE ────────────────────────────────────────────────────────────────
const Store = {
  key: 'tomeocean_v1',
  save() { try { localStorage.setItem(this.key, JSON.stringify(S.user)); } catch(_){} },
  load() {
    try {
      // Migrate from old bookmind key
      const old = localStorage.getItem('bookmind_v1');
      const fresh = localStorage.getItem(this.key);
      const d = JSON.parse(fresh || old || 'null');
      if (d) Object.assign(S.user, d);
    } catch(_) {}
  },
};

// ── UTILS ──────────────────────────────────────────────────────────────────
const cover = (isbn, sz='M') => `https://covers.openlibrary.org/b/isbn/${isbn}-${sz}.jpg`;
const genreColor = (idx) => {
  const palette = ['#00c8ff','#0077b6','#00f5d4','#f5c87a','#ff6b6b','#ff9a8b',
                   '#00b4a0','#38bdf8','#fbbf24','#d97706','#dc2626','#a78bfa',
                   '#06b6d4','#84cc16','#c084fc','#3b82f6','#f472b4','#fb923c','#e11d48','#9ca3af'];
  return palette[idx % palette.length];
};
const ratingHints = ['','Didn\'t enjoy it','It was okay','Liked it','Really loved it','Perfect book! ⭐'];
const findBook = id => BOOKS_DATA.find(b => b.id === id);

// ── BOOK FUN FACTS ─────────────────────────────────────────────────────────
const BOOK_FACTS = [
  "📚 The word 'book' comes from the Old English 'bōc', related to 'beech' — early runes were carved on beech wood!",
  "🌊 The world's largest library, the US Library of Congress, holds over 170 million items across 838 miles of bookshelves.",
  "🦀 Did you know? J.K. Rowling wrote the first Harry Potter on napkins in a café because she couldn't afford notebooks.",
  "🐢 The longest novel ever written is 'In Search of Lost Time' by Marcel Proust — 1.5 million words across 7 volumes.",
  "🐬 Iceland publishes more books per capita than any other country — they call it Jólabókaflóð (the 'Yule Book Flood')!",
  "📖 The first printed book in English was Chaucer's Canterbury Tales, printed by William Caxton in 1476.",
  "🌺 Agatha Christie is the best-selling fiction writer of all time, with over 2 billion copies of her books sold.",
  "🐠 'Don Quixote' by Cervantes is often cited as the world's first modern novel, published in 1605.",
  "⚓ The Harry Potter series has been translated into 80 languages — including Latin and Ancient Greek!",
  "🦀 Stephen King writes 2,000 words every single day, including birthdays and holidays.",
  "🐢 The Bible is the world's best-selling book, with an estimated 5 billion copies sold.",
  "🌊 A 'bibliophile' is a person who loves books. A 'tsundoku' (Japanese) is buying books and letting them pile up unread.",
  "🐬 Shakespeare invented over 1,700 words we still use today, including 'bedroom', 'generous', and 'zany'.",
  "📚 Oxford University libraries hold over 13 million books that would span 175 miles if stacked spine to spine.",
  "🏄 The first public library in the United States opened in Peterborough, New Hampshire in 1833.",
  "🐠 Leo Tolstoy's 'War and Peace' has about 580,000 words. He rewrote it by hand seven times.",
  "🦀 Mark Twain was one of the first authors to submit a typewritten manuscript — Adventures of Tom Sawyer in 1876.",
  "⚡ Dr. Seuss wrote 'Green Eggs and Ham' after his editor bet him he couldn't write a book with only 50 different words.",
  "📖 The oldest known story is 'The Epic of Gilgamesh', written on clay tablets around 2100 BCE.",
  "🌺 Gabriel García Márquez wrote 'One Hundred Years of Solitude' in 18 months after a sudden flash of inspiration.",
  "🌊 The average person reads about 200-400 words per minute. Speed readers can reach 1,000+ wpm.",
  "🐢 Sherlock Holmes never actually says 'Elementary, my dear Watson' in any of Conan Doyle's stories.",
  "🐬 F. Scott Fitzgerald's 'The Great Gatsby' sold only 20,000 copies in his lifetime. Now it sells 500,000 per year.",
  "📚 The world reads over 2 million books per day. You're helping keep that streak alive! 🎉",
  "🦀 'Anna Karenina' begins mid-thought — Tolstoy originally started at a different point in the story.",
  "🐠 Mary Shelley wrote Frankenstein at age 18 during a ghost story competition on a stormy Swiss night.",
  "⚓ The word 'novel' comes from the Italian 'novella', meaning 'new story'.",
  "🏄 Authors George Eliot, George Sand, and the Brontë sisters all used male pen names to be taken seriously.",
  "📖 The US publishes over 300,000 new books every year — that's about 822 books per day!",
  "🌺 Virginia Woolf wrote all her novels standing up at a specially built desk.",
];

// ── MOODS ──────────────────────────────────────────────────────────────────
const MOODS = [
  { id:'inspiring',  label:'✨ Inspire Me',   genres:[8,7,5],    themes:[5],    color:'#f5c87a' },
  { id:'dark',       label:'🌑 Dark & Gritty', genres:[10,3,4],   themes:[0,6],  color:'#7c3aed' },
  { id:'adventure',  label:'🗺️ Adventure',    genres:[17,2,1],   themes:[3],    color:'#00b4a0' },
  { id:'romantic',   label:'🌺 Romance',       genres:[5,12],     themes:[2],    color:'#ff6b6b' },
  { id:'mindblow',   label:'🤯 Mind-Blowing',  genres:[15,14,16], themes:[4],    color:'#00c8ff' },
  { id:'cozy',       label:'☕ Cozy Read',     genres:[3,11,0],   themes:[1,9],  color:'#fb923c' },
  { id:'epic',       label:'⚔️ Epic Fantasy',  genres:[2,13,17],  themes:[0,3],  color:'#a855f7' },
  { id:'ocean',      label:'🌊 Ocean Vibes',   genres:[17,0,11],  themes:[0,8],  color:'#0077b6' },
];

// ── BEACH CHARACTERS ────────────────────────────────────────────────────────
const CHAR_FACTS = {
  crab:    BOOK_FACTS.filter((_, i) => i % 4 === 0),
  turtle:  BOOK_FACTS.filter((_, i) => i % 4 === 1),
  dolphin: BOOK_FACTS.filter((_, i) => i % 4 === 2),
  fish:    BOOK_FACTS.filter((_, i) => i % 4 === 3),
};
let charFactIndices = { crab:0, turtle:0, dolphin:0, fish:0 };
let charTimers = {};

function initBeachChars() {
  const chars = ['crab','turtle','dolphin','fish'];
  chars.forEach((char, i) => {
    // Stagger initial dialogue appearance
    setTimeout(() => {
      showCharDialogue(char);
      charTimers[char] = setInterval(() => {
        if (!S.activeDialogues[char]) return;
        charFactIndices[char] = (charFactIndices[char] + 1) % CHAR_FACTS[char].length;
        updateCharDialogue(char);
      }, 7000);
    }, 3000 + i * 1800);
  });
}

function showCharDialogue(char) {
  const el = document.getElementById(`dialogue-${char}`);
  if (!el) return;
  el.textContent = CHAR_FACTS[char][charFactIndices[char]];
  el.classList.add('visible');
  S.activeDialogues[char] = true;
}

function hideCharDialogue(char) {
  const el = document.getElementById(`dialogue-${char}`);
  if (!el) return;
  el.classList.remove('visible');
  S.activeDialogues[char] = false;
}

function updateCharDialogue(char) {
  const el = document.getElementById(`dialogue-${char}`);
  if (!el) return;
  el.style.transition = 'none';
  el.style.opacity = '0';
  setTimeout(() => {
    el.textContent = CHAR_FACTS[char][charFactIndices[char]];
    el.style.transition = '';
    el.style.opacity = '1';
  }, 300);
}

function toggleCharDialogue(char) {
  if (S.activeDialogues[char]) {
    hideCharDialogue(char);
  } else {
    charFactIndices[char] = (charFactIndices[char] + 1) % CHAR_FACTS[char].length;
    showCharDialogue(char);
  }
}
window.toggleCharDialogue = toggleCharDialogue;

// ── OCEAN PARTICLE SYSTEM ───────────────────────────────────────────────────
function initOceanCanvas() {
  const cvs = document.getElementById('ocean-canvas');
  const ctx = cvs.getContext('2d');
  let bubbles = [];
  const N_BUBBLES = 45;

  function resize() { cvs.width = innerWidth; cvs.height = innerHeight; }

  function makeBubbles() {
    bubbles = Array.from({ length: N_BUBBLES }, () => ({
      x: Math.random() * cvs.width,
      y: Math.random() * cvs.height + cvs.height,
      r: Math.random() * 3 + 1,
      vx: (Math.random() - .5) * .4,
      vy: -(Math.random() * .6 + .2),
      alpha: Math.random() * 0.4 + 0.1,
      hue: Math.random() > .5 ? 195 : 170,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    bubbles.forEach(b => {
      b.x += b.vx;
      b.y += b.vy;
      if (b.y < -20) {
        b.y = cvs.height + 20;
        b.x = Math.random() * cvs.width;
      }
      // Bubble glow
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 3);
      grad.addColorStop(0, `hsla(${b.hue},90%,70%,${b.alpha})`);
      grad.addColorStop(1, `hsla(${b.hue},90%,70%,0)`);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      // Core
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${b.hue},90%,80%,${b.alpha + .2})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  resize();
  makeBubbles();
  draw();
  window.addEventListener('resize', () => { resize(); makeBubbles(); });
}

// ── RIPPLE CURSOR SYSTEM ────────────────────────────────────────────────────
function initRipples() {
  const cvs = document.getElementById('ripple-canvas');
  const ctx = cvs.getContext('2d');
  let rings = [];
  let mouseX = -999, mouseY = -999;
  let lastMouse = 0;

  function resize() { cvs.width = innerWidth; cvs.height = innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  // Track mouse
  window.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    const now = Date.now();
    if (now - lastMouse > 40) {
      rings.push({ x: mouseX, y: mouseY, r: 0, maxR: 40, alpha: 0.5, type: 'trail' });
      lastMouse = now;
    }
  });

  // Click splash
  window.addEventListener('click', e => {
    spawnSplash(e.clientX, e.clientY);
  });

  function spawnSplash(x, y) {
    for (let i = 0; i < 4; i++) {
      rings.push({
        x, y, r: 0,
        maxR: 40 + i * 30,
        alpha: 0.7 - i * 0.12,
        type: 'click',
        delay: i * 60,
        born: Date.now(),
      });
    }
    // Droplet particles
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 2 + Math.random() * 3;
      rings.push({
        x, y, type: 'droplet',
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: 2 + Math.random() * 2,
        alpha: 0.8,
        born: Date.now(),
      });
    }
  }

  function drawFrame() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const now = Date.now();
    rings = rings.filter(ring => ring.alpha > 0.01);

    rings.forEach(ring => {
      if (ring.type === 'trail') {
        ring.r += 1.2;
        ring.alpha *= 0.88;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,200,255,${ring.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (ring.type === 'click') {
        if (now - ring.born < ring.delay) return;
        ring.r += (ring.maxR - ring.r) * 0.12 + 1;
        ring.alpha *= 0.93;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,245,212,${ring.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (ring.type === 'droplet') {
        ring.x += ring.vx;
        ring.y += ring.vy;
        ring.vy += 0.18; // gravity
        ring.alpha *= 0.92;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,200,255,${ring.alpha})`;
        ctx.fill();
      }
    });
    requestAnimationFrame(drawFrame);
  }

  drawFrame();

  // Also spawn splash on button clicks
  document.addEventListener('click', e => {
    const btn = e.target.closest('button, .book-card, .filter-btn, .mood-btn, .genre-card');
    if (btn && btn !== e.target) return; // only direct hits
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Only if not already handled by the window click
    }
  });
}

// ── CURRENTLY READING ──────────────────────────────────────────────────────
function getCurrentlyReading() {
  return (S.user.currentlyReading || []).map(id => findBook(id)).filter(Boolean);
}
function isCurrentlyReading(bookId) {
  return (S.user.currentlyReading || []).includes(bookId);
}
function toggleCurrentlyReading(bookId) {
  if (!S.user.currentlyReading) S.user.currentlyReading = [];
  if (isCurrentlyReading(bookId)) {
    S.user.currentlyReading = S.user.currentlyReading.filter(id => id !== bookId);
    toast('Removed from Currently Reading', 'info', '📖');
  } else {
    S.user.currentlyReading.unshift(bookId);
    if (S.user.currentlyReading.length > 5) S.user.currentlyReading = S.user.currentlyReading.slice(0,5);
    toast('Added to Currently Reading! 📖', 'success', '🌊');
  }
  Store.save();
  if (S.view === 'rec') renderRecs();
}
window.toggleCurrentlyReading = toggleCurrentlyReading;

function estimateReadTime(pages) {
  const hours = Math.round(pages / 250);
  if (hours < 1) return '< 1 hr';
  if (hours === 1) return '~1 hr';
  return `~${hours} hrs`;
}

function getUserRating(bookId) {
  const r = S.user.ratings.find(x => x.bookId === bookId);
  return r ? r.rating : 0;
}

// ── TOAST ──────────────────────────────────────────────────────────────────
function toast(msg, type='info', icon='🌊') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'slideInRight .35s ease reverse';
    setTimeout(() => t.remove(), 350);
  }, 2800);
}

// ── CONFETTI (Ocean Edition) ────────────────────────────────────────────────
function confetti() {
  const colors = ['#00c8ff','#00f5d4','#f5c87a','#ff6b6b','#0077b6','#a855f7'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `left:${Math.random()*100}vw;top:-10px;background:${colors[i%colors.length]};
      animation-duration:${1.2+Math.random()*1.5}s;animation-delay:${Math.random()*.5}s;
      width:${6+Math.random()*6}px;height:${6+Math.random()*6}px;border-radius:${Math.random()>.5?'50%':'3px'}`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 3200);
  }
}

// ── NAVIGATION ─────────────────────────────────────────────────────────────
function navigate(view) {
  ['hero','rec','search','lists'].forEach(v => {
    const el = document.getElementById(v+'-section');
    if (!el) return;
    if (v === view) {
      el.classList.remove('hidden');
      el.classList.remove('wave-enter');
      void el.offsetWidth; // force reflow
      el.classList.add('wave-enter');
    } else {
      el.classList.add('hidden');
    }
  });
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.view === view);
  });
  S.view = view;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── COVER IMAGE ────────────────────────────────────────────────────────────
function imgTag(isbn, alt, cls='') {
  const fb = `<div class="book-cover-fb"><span style="font-size:2.5rem">📖</span></div>`;
  return `<img src="${cover(isbn)}" alt="${alt}" class="${cls}" onerror="this.outerHTML='${fb.replace(/"/g,"'")}'" loading="lazy">`;
}

// ── BOOK CARD ──────────────────────────────────────────────────────────────
function bookCard(book, opts={}) {
  const r = getUserRating(book.id);
  const score = (opts.score != null) ? opts.score : (book.avgRating/5);
  const pills = (book.genres||[]).slice(0,3).map(g =>
    `<span class="genre-pill" style="color:${genreColor(g)};border-color:${genreColor(g)}44">${GENRE_NAMES[g]}</span>`).join('');
  const rBadge = r ? `<div class="rated-badge">★ ${r}</div>` : '';

  return `
  <div class="book-card" data-id="${book.id}" onclick="openBookDetail(${book.id})">
    <div class="book-card-inner">
      <div class="book-face">
        ${rBadge}
        <div class="book-cover">${imgTag(book.isbn, book.title)}</div>
        <div class="book-strip">
          <div class="book-title-sm">${book.title}</div>
          <div class="book-author-sm">${book.author}</div>
          <div class="book-score-bar"><div class="book-score-fill" style="width:${Math.round(score*100)}%"></div></div>
        </div>
      </div>
      <div class="book-back">
        <div class="book-back-title">${book.title}</div>
        <div class="book-back-author">${book.author} · ${book.year > 0 ? book.year : 'Classic'}</div>
        <div class="genre-pills">${pills}</div>
        <div class="book-back-desc">${book.description}</div>
        ${book.mlScore != null ? `<div style="font-size:.68rem;color:var(--txm)">🤖 ${book.mlScore}% match${book.reason?` · ${book.reason}`:''}</div>` : ''}
        <div class="book-back-actions">
          <button class="btn-rate" onclick="openRating(${book.id});event.stopPropagation()">⭐ Rate</button>
          <button class="btn-add-list" onclick="openAddToList(${book.id});event.stopPropagation()">+ Shelf</button>
          <button class="btn-details" onclick="event.stopPropagation();openBookDetail(${book.id})">Info</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ── MOOD FILTER ────────────────────────────────────────────────────────────
function renderMoodBar() {
  const bar = document.getElementById('mood-bar');
  if (!bar) return;
  bar.innerHTML = MOODS.map(m => `
    <button class="mood-btn ${S.activeMood===m.id?'active':''}" data-mood="${m.id}"
      style="--mc:${m.color};${S.activeMood===m.id?`background:${m.color}22;border-color:${m.color};color:${m.color}`:''}"
      onclick="setMood('${m.id}')">${m.label}</button>`).join('');
}

function setMood(moodId) {
  S.activeMood = (S.activeMood === moodId) ? null : moodId;
  renderMoodBar();
  renderRecs();
}
window.setMood = setMood;

// ── CURRENTLY READING STRIP ────────────────────────────────────────────────
function renderCurrentlyReadingStrip() {
  const strip = document.getElementById('currently-reading-strip');
  if (!strip) return;
  const books = getCurrentlyReading();
  if (!books.length) { strip.innerHTML = ''; return; }
  strip.innerHTML = `
    <div class="cr-strip">
      <div class="cr-strip-title">📖 Currently Reading</div>
      <div class="cr-strip-books">
        ${books.map(b => `
          <div class="cr-strip-item" onclick="openBookDetail(${b.id})">
            <div class="cr-strip-cover">${imgTag(b.isbn, b.title)}</div>
            <div class="cr-strip-info">
              <div class="cr-strip-book-title">${b.title}</div>
              <div class="cr-strip-book-author">${b.author}</div>
              <div class="cr-strip-book-meta">${b.pages} pages · ${estimateReadTime(b.pages)}</div>
            </div>
            <button class="cr-strip-done" onclick="event.stopPropagation();toggleCurrentlyReading(${b.id})" title="Done reading">✓ Done</button>
          </div>`).join('')}
      </div>
    </div>`;
}

// ── RECOMMENDATIONS ────────────────────────────────────────────────────────
function renderRecs() {
  const grid = document.getElementById('books-grid');
  if (!S.recommender) { grid.innerHTML = '<p style="color:var(--txs)">Loading AI engine…</p>'; return; }

  const hasProfile = S.user.ratings.length > 0 || S.user.genres.length > 0;
  const persona = S.recommender.getPersonaName(S.user.ratings, S.user.genres);

  document.getElementById('user-greeting').textContent =
    S.user.name ? `For ${S.user.name} 🌊` : (hasProfile ? 'Your Ocean Picks' : 'Trending Tides');
  document.getElementById('persona-badge').textContent = hasProfile ? `🌊 ${persona}` : '🌊 Popular';
  document.getElementById('insight-text').textContent =
    S.user.ratings.length
      ? `Based on ${S.user.ratings.length} rating${S.user.ratings.length>1?'s':''} — refining your taste currents`
      : hasProfile ? 'Rate some books to sharpen the AI personalisation'
      : 'Complete onboarding to get personalised picks — showing trending books for now';

  renderMoodBar();
  renderCurrentlyReadingStrip();

  let recs;
  if (S.activeMood) {
    const mood = MOODS.find(m => m.id === S.activeMood);
    if (mood) {
      const moodBooks = BOOKS_DATA
        .filter(b => !S.user.ratings.map(r=>r.bookId).includes(b.id))
        .filter(b => b.genres.some(g => mood.genres.includes(g)) || b.themes.some(t => mood.themes.includes(t)))
        .sort((a,b) => b.avgRating - a.avgRating)
        .slice(0, 24);
      recs = moodBooks.map(b => ({...b, score: b.avgRating/5, mlScore: 0, reason: mood.label}));
    }
  } else if (!hasProfile) {
    recs = BOOKS_DATA
      .sort((a,b) => b.avgRating - a.avgRating)
      .slice(0, 24)
      .map(b => ({...b, score: b.avgRating/5, mlScore: 0, reason: 'Highly Rated'}));
  } else {
    recs = S.recommender.recommend(S.user.ratings, S.user.genres, 24, S.user.readHistory);
  }

  grid.innerHTML = recs.map(b => bookCard(b, {score: b.score})).join('');
}

// ── SEARCH ─────────────────────────────────────────────────────────────────
function runSearch(q) {
  const grid = document.getElementById('search-grid');
  const query = q.toLowerCase().trim();
  let results = query
    ? BOOKS_DATA.filter(b =>
        b.title.toLowerCase().includes(query) ||
        b.author.toLowerCase().includes(query) ||
        b.description.toLowerCase().includes(query) ||
        (b.genres||[]).some(g => GENRE_NAMES[g].toLowerCase().includes(query)))
    : [...BOOKS_DATA].sort((a,b) => b.avgRating - a.avgRating);

  if (S.searchFilter != null) results = results.filter(b => b.genres.includes(S.searchFilter));
  grid.innerHTML = results.length
    ? results.map(b => bookCard(b)).join('')
    : `<div style="grid-column:1/-1;text-align:center;color:var(--txm);padding:60px">No books found for "${q}"</div>`;
}

// ── READING LISTS ──────────────────────────────────────────────────────────
function renderLists() {
  const c = document.getElementById('lists-container');
  if (!S.user.lists.length) {
    c.innerHTML = `<div style="text-align:center;padding:80px;color:var(--txm)">
      <div style="font-size:3rem;margin-bottom:12px">🌊</div>
      <div style="font-family:var(--fd);font-size:1.2rem;margin-bottom:8px">No shelves yet</div>
      <div>Create your first reading shelf above</div></div>`;
    return;
  }
  c.innerHTML = `<div class="lists-grid">${S.user.lists.map(list => {
    const books = list.books.slice(0,4).map(id => findBook(id)).filter(Boolean);
    const coversHtml = books.map(b =>
      `<div class="list-cover-mini">${imgTag(b.isbn,b.title)}</div>`).join('');
    return `<div class="list-card">
      <div class="list-card-header">
        <div class="list-card-title">${list.name}</div>
        <div class="list-card-count">${list.books.length} book${list.books.length!==1?'s':''}</div>
      </div>
      ${books.length ? `<div class="list-covers">${coversHtml}</div>` : '<div style="height:20px"></div>'}
      <div class="list-card-acts">
        <button class="btn-share-list" onclick="shareList('${list.id}')">🔗 Share Shelf</button>
        <button class="btn-del-list" onclick="deleteList('${list.id}')">🗑</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function createList() {
  const inp = document.getElementById('new-list-name');
  const name = inp.value.trim();
  if (!name) { toast('Enter a shelf name', 'error', '⚠️'); return; }
  const id = 'list_' + Date.now();
  S.user.lists.push({ id, name, books: [] });
  Store.save(); renderLists(); inp.value = '';
  toast(`"${name}" created!`, 'success', '✅');
}

function deleteList(id) {
  S.user.lists = S.user.lists.filter(l => l.id !== id);
  Store.save(); renderLists();
  toast('Shelf deleted', 'info', '🗑️');
}

function shareList(id) {
  const list = S.user.lists.find(l => l.id === id);
  if (!list) return;
  const data = btoa(JSON.stringify({ name: list.name,
    books: list.books.map(id => { const b = findBook(id); return b ? {t:b.title,a:b.author} : null;}).filter(Boolean) }));
  const url = `${location.href.split('#')[0]}#shared=${data}`;
  navigator.clipboard.writeText(url).then(() => {
    toast('Link copied to clipboard! 🎉', 'success', '🔗');
    confetti();
  }).catch(() => toast('Share URL: '+url.slice(0,50)+'…','info','🔗'));
}

// ── ADD TO LIST MODAL ──────────────────────────────────────────────────────
function openAddToList(bookId) {
  S.addListTarget = bookId;
  const book = findBook(bookId);
  const overlay = document.getElementById('add-list-modal');
  if (!S.user.lists.length) {
    toast('Create a shelf first in My Shelf!', 'info', '📋');
    navigate('lists'); return;
  }
  const opts = S.user.lists.map(l => {
    const has = l.books.includes(bookId);
    return `<div class="add-list-opt ${has?'added':''}" onclick="toggleBookInList('${l.id}',${bookId},this)">
      <span>${l.name}</span><span>${has?'✅ Added':'+ Add'}</span></div>`;
  }).join('');
  overlay.querySelector('.add-list-options').innerHTML = opts;
  overlay.querySelector('.add-list-sub').textContent = `"${book?.title?.slice(0,30)}"`;
  overlay.classList.remove('hidden');
}

function toggleBookInList(listId, bookId, el) {
  const list = S.user.lists.find(l => l.id === listId);
  if (!list) return;
  if (list.books.includes(bookId)) {
    list.books = list.books.filter(id => id !== bookId);
    el.classList.remove('added'); el.querySelector('span:last-child').textContent = '+ Add';
    toast('Removed from shelf', 'info', '❌');
  } else {
    list.books.push(bookId);
    el.classList.add('added'); el.querySelector('span:last-child').textContent = '✅ Added';
    toast('Added to shelf!', 'success', '✅');
  }
  Store.save();
}

// ── RATING MODAL ───────────────────────────────────────────────────────────
function openRating(bookId) {
  S.ratingTarget = bookId;
  const book = findBook(bookId);
  const existing = getUserRating(bookId);
  const overlay = document.getElementById('rating-modal');

  overlay.querySelector('.rating-title').textContent = book.title;
  overlay.querySelector('.rating-author').textContent = book.author;
  overlay.querySelector('.rating-cover').innerHTML = imgTag(book.isbn, book.title);
  overlay.querySelector('.rating-hint').textContent = existing ? ratingHints[existing] : 'Tap a star to rate';

  const row = overlay.querySelector('.stars-row');
  row.innerHTML = [1,2,3,4,5].map(n =>
    `<span class="star ${n<=existing?'lit':''}" data-val="${n}">⭐</span>`).join('');

  const btn = overlay.querySelector('.btn-submit-rating');
  btn.disabled = !existing;
  let chosen = existing;

  row.querySelectorAll('.star').forEach(star => {
    star.addEventListener('mouseover', () => {
      row.querySelectorAll('.star').forEach(s => s.classList.toggle('hovlit', +s.dataset.val <= +star.dataset.val));
      overlay.querySelector('.rating-hint').textContent = ratingHints[+star.dataset.val];
    });
    star.addEventListener('mouseout', () => {
      row.querySelectorAll('.star').forEach(s => { s.classList.remove('hovlit'); s.classList.toggle('lit', +s.dataset.val <= chosen); });
      overlay.querySelector('.rating-hint').textContent = chosen ? ratingHints[chosen] : 'Tap a star to rate';
    });
    star.addEventListener('click', () => {
      chosen = +star.dataset.val;
      row.querySelectorAll('.star').forEach(s => s.classList.toggle('lit', +s.dataset.val <= chosen));
      btn.disabled = false;
    });
  });

  btn.onclick = () => submitRating(bookId, chosen);
  overlay.classList.remove('hidden');
}

function submitRating(bookId, rating) {
  if (!rating) return;
  const existing = S.user.ratings.findIndex(r => r.bookId === bookId);
  if (existing >= 0) S.user.ratings[existing].rating = rating;
  else S.user.ratings.push({ bookId, rating, date: Date.now() });
  Store.save();
  closeModal('rating-modal');
  toast(`Rated "${findBook(bookId)?.title?.slice(0,22)}…" ${rating}★`, 'success', '⭐');
  if (S.view === 'rec') renderRecs();
}

// ── BOOK DETAIL MODAL ──────────────────────────────────────────────────────
function openBookDetail(bookId) {
  const book = findBook(bookId);
  if (!book) return;
  const overlay = document.getElementById('book-modal');

  const pills = book.genres.map(g => `<span class="bd-pill" style="border-color:${genreColor(g)}55;color:${genreColor(g)}">${GENRE_NAMES[g]}</span>`).join('');
  const r = getUserRating(bookId);
  const reading = isCurrentlyReading(bookId);
  const similar = S.recommender ? S.recommender.getSimilar(bookId, 6) : [];
  const simHtml = similar.map(b => `<div class="similar-card" onclick="closeModal('book-modal');openBookDetail(${b.id})">
    ${imgTag(b.isbn, b.title)}<div class="similar-card-ttl">${b.title}</div></div>`).join('');

  const links = typeof getReadLinks === 'function' ? getReadLinks(book) : [];
  const linkHtml = links.map(l =>
    `<a class="read-link" href="${l.url}" target="_blank" rel="noopener"
      style="color:${l.color};border-color:${l.color}55;background:${l.color}12">
      ${l.icon} ${l.label}</a>`).join('');

  overlay.querySelector('.modal-box').innerHTML = `
    <button class="modal-close" onclick="closeModal('book-modal')">✕</button>
    <div class="bd-hero">
      <div class="bd-cover">${imgTag(book.isbn, book.title)}</div>
      <div>
        <div class="bd-title">${book.title}</div>
        <div class="bd-author">${book.author}</div>
        <div class="bd-pills">${pills}</div>
        <div class="bd-stats">
          <div><div class="bd-sv">⭐ ${book.avgRating}</div><div class="bd-sl">Avg Rating</div></div>
          <div><div class="bd-sv">${book.year > 0 ? book.year : 'Ancient'}</div><div class="bd-sl">Published</div></div>
          <div><div class="bd-sv">${book.pages}</div><div class="bd-sl">Pages</div></div>
          <div><div class="bd-sv" style="color:var(--teal)">${estimateReadTime(book.pages)}</div><div class="bd-sl">Est. Time</div></div>
          ${r ? `<div><div class="bd-sv" style="color:var(--sand)">★ ${r}</div><div class="bd-sl">Your Rating</div></div>` : ''}
        </div>
        <div class="bd-acts">
          <button class="btn-primary" onclick="openRating(${book.id})">⭐ ${r?'Update':'Rate'} Book</button>
          <button class="btn-ghost ${reading?'reading-active':''}" onclick="toggleCurrentlyReading(${book.id});this.textContent=isCurrentlyReading(${book.id})?'📖 Reading':'+ Reading'">
            ${reading ? '📖 Reading' : '+ Reading'}
          </button>
          <button class="btn-ghost" onclick="closeModal('book-modal');openAddToList(${book.id})">+ Shelf</button>
        </div>
        ${linkHtml ? `<div class="bd-links">${linkHtml}</div>` : ''}
      </div>
    </div>
    <div class="bd-body">
      <p class="bd-desc">${book.description}</p>
      ${simHtml ? `<div class="bd-similar-title">You May Also Like</div><div class="similar-grid">${simHtml}</div>` : ''}
    </div>`;

  overlay.classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ── ONBOARDING ─────────────────────────────────────────────────────────────
const QUICK_RATE_IDS = [12, 8, 3, 50, 63, 26];

function showOnboarding() {
  S.onboardingStep = 1;
  S.onboardingRatings = {};
  renderOnboardingStep();
  document.getElementById('onboarding-modal').classList.remove('hidden');
}

function renderOnboardingStep() {
  const step = S.onboardingStep;
  const box = document.getElementById('onboarding-content');
  const total = 3;
  const dots = Array.from({length:total}, (_,i) =>
    `<div class="ob-dot ${i<step-1?'done':i===step-1?'active':''}"></div>`).join('');

  if (step === 1) {
    box.innerHTML = `
      <div class="ob-progress">${dots}</div>
      <div class="ob-title">Welcome to TomeOcean 🌊</div>
      <div class="ob-desc">Your AI-powered book discovery engine. Dive in and find your next great read — let's personalise your experience in 3 quick steps.</div>
      <input class="ob-input" id="ob-name" placeholder="What's your name?" value="${S.user.name}" maxlength="30">
      <div class="ob-actions">
        <button class="btn-primary" onclick="obNext()">Next →</button>
      </div>`;
  } else if (step === 2) {
    const cards = GENRE_NAMES.map((name,i) =>
      `<div class="genre-card ${S.user.genres.includes(i)?'selected':''}" onclick="toggleGenre(${i},this)">
        <div class="genre-card-icon">${GENRE_ICONS[i]}</div>
        <div class="genre-card-name">${name}</div>
      </div>`).join('');
    box.innerHTML = `
      <div class="ob-progress">${dots}</div>
      <div class="ob-title">What do you love reading?</div>
      <div class="ob-desc">Pick your favourite genres — choose as many as you like.</div>
      <div class="genre-grid">${cards}</div>
      <div class="ob-actions">
        <button class="btn-ghost" onclick="obBack()">← Back</button>
        <button class="btn-primary" onclick="obNext()">Next →</button>
      </div>`;
  } else if (step === 3) {
    const items = QUICK_RATE_IDS.map(id => {
      const b = findBook(id); if (!b) return '';
      const cur = S.onboardingRatings[id] || 0;
      const stars = [1,2,3,4,5].map(n =>
        `<span class="qr-star ${n<=cur?'lit':''}" data-id="${b.id}" data-val="${n}">⭐</span>`).join('');
      return `<div class="qr-item">
        <div class="qr-cover">${imgTag(b.isbn, b.title)}</div>
        <div class="qr-info">
          <div class="qr-title">${b.title}</div>
          <div class="qr-author">${b.author}</div>
          <div class="qr-stars">${stars}</div>
        </div>
      </div>`;
    }).join('');
    box.innerHTML = `
      <div class="ob-progress">${dots}</div>
      <div class="ob-title">Quick Taste Test 🎯</div>
      <div class="ob-desc">Rate any books you've read — skip ones you haven't. This seeds the AI.</div>
      <div class="ob-quick-rate">${items}</div>
      <div class="ob-actions">
        <button class="btn-ghost" onclick="obBack()">← Back</button>
        <button class="btn-primary" onclick="obFinish()">Dive In! 🌊</button>
      </div>`;

    document.querySelectorAll('.qr-star').forEach(star => {
      star.addEventListener('mouseover', () => {
        const id = +star.dataset.id, val = +star.dataset.val;
        document.querySelectorAll(`.qr-star[data-id="${id}"]`).forEach(s => s.classList.toggle('hovlit', +s.dataset.val <= val));
      });
      star.addEventListener('mouseout', () => {
        const id = +star.dataset.id, cur = S.onboardingRatings[id] || 0;
        document.querySelectorAll(`.qr-star[data-id="${id}"]`).forEach(s => { s.classList.remove('hovlit'); s.classList.toggle('lit', +s.dataset.val <= cur); });
      });
      star.addEventListener('click', () => {
        const id = +star.dataset.id, val = +star.dataset.val;
        S.onboardingRatings[id] = val;
        document.querySelectorAll(`.qr-star[data-id="${id}"]`).forEach(s => s.classList.toggle('lit', +s.dataset.val <= val));
      });
    });
  }
}

function toggleGenre(idx, el) {
  if (S.user.genres.includes(idx)) {
    S.user.genres = S.user.genres.filter(g => g !== idx);
    el.classList.remove('selected');
  } else {
    S.user.genres.push(idx);
    el.classList.add('selected');
  }
}

function obNext() {
  if (S.onboardingStep === 1) {
    const name = document.getElementById('ob-name')?.value.trim();
    if (name) S.user.name = name;
  }
  S.onboardingStep++;
  renderOnboardingStep();
}

function obBack() { S.onboardingStep--; renderOnboardingStep(); }

function obFinish() {
  Object.entries(S.onboardingRatings).forEach(([id, rating]) => {
    const bid = +id;
    const existing = S.user.ratings.findIndex(r => r.bookId === bid);
    if (rating) {
      if (existing >= 0) S.user.ratings[existing].rating = rating;
      else S.user.ratings.push({ bookId: bid, rating, date: Date.now() });
    }
  });
  Store.save();
  closeModal('onboarding-modal');
  toast(`Welcome, ${S.user.name || 'Explorer'}! Your ocean awaits 🌊`, 'success', '🚀');
  confetti();
  navigate('rec');
  setTimeout(renderRecs, 400);
}

// ── SHARED LIST VIEWER ─────────────────────────────────────────────────────
function checkSharedList() {
  const hash = location.hash;
  if (!hash.startsWith('#shared=')) return;
  try {
    const data = JSON.parse(atob(hash.slice(8)));
    const page = document.getElementById('shared-page');
    document.getElementById('sp-title').textContent = data.name;
    document.getElementById('sp-meta').textContent =
      `Curated by ${data.creator || 'A Reader'} · ${data.books.length} book${data.books.length!==1?'s':''}  ·  Powered by TomeOcean AI`;

    const grid = document.getElementById('sp-grid');
    grid.innerHTML = data.books.map((b, i) => {
      const full = findBook(b.id) || { title:b.t, author:b.a, isbn:b.isbn, description:'Discover this book online.', genres:[], year:0, avgRating:0 };
      const pills = (full.genres||[]).slice(0,3).map(g =>
        `<span class="genre-pill" style="color:${genreColor(g)};border-color:${genreColor(g)}44">${GENRE_NAMES[g]}</span>`).join('');
      const links = typeof getReadLinks === 'function' ? getReadLinks(full) : [];
      const linkHtml = links.map(l =>
        `<a class="read-link" href="${l.url}" target="_blank" rel="noopener"
          style="color:${l.color};border-color:${l.color}55;background:${l.color}12">
          ${l.icon} ${l.label}</a>`).join('');
      const fb = `<div style="background:linear-gradient(135deg,rgba(0,119,182,.3),rgba(0,245,212,.15));width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.8rem">📖</div>`;
      return `<div class="sp-book" style="animation:fadeInUp .5s ease ${i*0.07}s both">
        <div class="sp-book-cover">
          <img src="https://covers.openlibrary.org/b/isbn/${full.isbn}-M.jpg" alt="${full.title}"
               style="width:100%;height:100%;object-fit:cover"
               onerror="this.outerHTML='${fb.replace(/"/g,"'")}'" loading="lazy"/>
        </div>
        <div class="sp-book-body">
          <div class="sp-book-num">#${i+1}</div>
          <div class="sp-book-title">${full.title}</div>
          <div class="sp-book-author">${full.author}${full.year ? ` · ${full.year}` : ''}</div>
          <div class="sp-book-genres">${pills}</div>
          <div class="sp-book-desc">${full.description}</div>
          <div class="read-links">${linkHtml}</div>
        </div>
      </div>`;
    }).join('');

    page.classList.remove('hidden');
    document.querySelector('main').style.display = 'none';
    document.getElementById('navbar').style.display = 'none';
    document.getElementById('beach-chars').style.display = 'none';
  } catch(e) { console.warn('Shared list decode failed', e); }
}

// ── INIT ───────────────────────────────────────────────────────────────────
function init() {
  Store.load();

  // Merge all book parts
  window.BOOKS_DATA = [
    ...(window.BOOKS_PART1 || []),
    ...(window.BOOKS_PART2 || []),
    ...(window.BOOKS_PART3 || []),
    ...(window.BOOKS_PART4 || []),
    ...(window.BOOKS_PART5 || []),
  ];

  // Update stat counter
  const statEl = document.getElementById('stat-books');
  if (statEl) statEl.textContent = (BOOKS_DATA.length > 500 ? '10,000+' : BOOKS_DATA.length + '+');

  // Init visual systems
  initOceanCanvas();
  initRipples();
  initBeachChars();

  // Nav links
  document.querySelectorAll('.nav-link[data-view]').forEach(l => {
    l.addEventListener('click', () => navigate(l.dataset.view));
  });

  // Global nav search
  const navSearch = document.getElementById('nav-search');
  navSearch.addEventListener('input', () => {
    if (navSearch.value.trim()) { navigate('search'); runSearch(navSearch.value); }
  });
  navSearch.addEventListener('keydown', e => {
    if (e.key === 'Enter' && navSearch.value.trim()) { navigate('search'); runSearch(navSearch.value); }
  });

  // Search page
  document.getElementById('search-input').addEventListener('input', e => runSearch(e.target.value));

  // Genre filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const g = btn.dataset.genre != null && btn.dataset.genre !== '' ? +btn.dataset.genre : null;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.searchFilter = (g === S.searchFilter || g === null) ? null : g;
      if (g === null) S.searchFilter = null;
      runSearch(document.getElementById('search-input').value);
    });
  });

  // My Shelf
  document.getElementById('btn-create-list').addEventListener('click', createList);
  document.getElementById('new-list-name').addEventListener('keydown', e => { if(e.key==='Enter') createList(); });

  // Close modals on overlay click
  ['rating-modal','book-modal','onboarding-modal','add-list-modal','shared-list-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { if(e.target === el) closeModal(id); });
  });

  // Init ML recommender
  if (typeof tf !== 'undefined') {
    S.recommender = new BookRecommender(BOOKS_DATA);
  }

  // Check for shared list in URL
  checkSharedList();

  // Start on discover
  navigate('rec');
  setTimeout(renderRecs, 300);

  // Hero book preview
  const previewIds = [12, 58, 11, 63, 8, 211, 217];
  const heroPreview = document.getElementById('hero-preview');
  if (heroPreview) {
    heroPreview.innerHTML = previewIds.map(id => {
      const b = findBook(id);
      return b ? `<div class="hero-mini-book float">${imgTag(b.isbn,b.title)}</div>` : '';
    }).join('');
  }

  // Initial renders
  runSearch('');
  renderLists();

  // Keyboard shortcut '/' = focus search
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      navigate('search');
      document.getElementById('search-input').focus();
    }
  });
}

window.addEventListener('DOMContentLoaded', init);

// Expose globals
window.openRating = openRating;
window.openAddToList = openAddToList;
window.openBookDetail = openBookDetail;
window.closeModal = closeModal;
window.toggleBookInList = toggleBookInList;
window.shareList = shareList;
window.deleteList = deleteList;
window.showOnboarding = showOnboarding;
window.obNext = obNext;
window.obBack = obBack;
window.obFinish = obFinish;
window.toggleGenre = toggleGenre;
window.navigate = navigate;
window.isCurrentlyReading = isCurrentlyReading;
