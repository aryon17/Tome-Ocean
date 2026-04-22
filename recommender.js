/**
 * BookMind ML Recommender
 * Uses TensorFlow.js for real ML-powered book recommendations.
 * Combines content-based filtering (cosine similarity) with
 * collaborative filtering (pre-defined persona clusters).
 */
class BookRecommender {
  constructor(books) {
    this.books = books;
    this.NUM_GENRES = 20;
    this.NUM_THEMES = 10;
    this.FEATURE_SIZE = this.NUM_GENRES + this.NUM_THEMES + 2; // 32

    // Pre-compute book feature matrix
    this._bookFeatureMatrix = books.map(b => this._bookVec(b));

    // Pre-defined collaborative personas (genre + theme distributions)
    this._personas = [
      // 0: Literary / Classic lover
      this._personaVec([11,19,0], [4,8,6]),
      // 1: Genre-fiction enthusiast (sci-fi, fantasy, thriller)
      this._personaVec([1,2,4,3], [0,3,6]),
      // 2: Self-improvement seeker
      this._personaVec([8,16,14,6], [4,5,8]),
      // 3: History / biography buff
      this._personaVec([9,7,13,6], [4,7,8]),
      // 4: Casual / YA / romance reader
      this._personaVec([12,5,0], [2,3,1]),
      // 5: Science & tech nerd
      this._personaVec([15,1,6], [4,7,8]),
    ];

    this._personaNames = [
      'Literary Connoisseur','Genre Explorer','Growth Seeker',
      'History Buff','Casual Reader','Science Enthusiast'
    ];
  }

  // ── Feature vector helpers ──────────────────────────────────────────────

  _bookVec(book) {
    const g = new Float32Array(this.NUM_GENRES);
    book.genres.forEach(i => { g[i] = 1; });

    const t = new Float32Array(this.NUM_THEMES);
    book.themes.forEach(i => { t[i] = 0.9; });

    const yearNorm = Math.min(1, Math.max(0, (book.year - 1800) / (2025 - 1800)));
    const ratingNorm = book.avgRating / 5.0;

    return [...g, ...t, yearNorm, ratingNorm];
  }

  _personaVec(genres, themes) {
    const g = new Float32Array(this.NUM_GENRES);
    genres.forEach(i => { g[i] = 1 / genres.length; });

    const t = new Float32Array(this.NUM_THEMES);
    themes.forEach(i => { t[i] = 1 / themes.length; });

    return [...g, ...t, 0.65, 0.80];
  }

  // ── TF.js cosine similarity (batch — user vec vs all books) ────────────

  _batchCosineSim(userVec, bookMatrix) {
    return tf.tidy(() => {
      const u = tf.tensor1d(userVec);
      const B = tf.tensor2d(bookMatrix);                    // [N, F]

      const uNorm = u.div(u.norm().add(1e-8));              // [F]
      const bNorm = B.div(B.norm(2, 1, true).add(1e-8));   // [N, F]

      // [N, F] · [F, 1] = [N, 1] → squeeze → [N]
      return bNorm.matMul(uNorm.expandDims(1)).squeeze().arraySync();
    });
  }

  _personaCosineSim(userVec, personas) {
    return tf.tidy(() => {
      const u = tf.tensor1d(userVec);
      const P = tf.tensor2d(personas);

      const uNorm = u.div(u.norm().add(1e-8));
      const pNorm = P.div(P.norm(2, 1, true).add(1e-8));

      return pNorm.matMul(uNorm.expandDims(1)).squeeze().arraySync();
    });
  }

  // ── Build user preference vector ────────────────────────────────────────

  buildUserVector(ratings) {
    if (!ratings || ratings.length === 0) return null;

    const sum = new Array(this.FEATURE_SIZE).fill(0);
    let totalWeight = 0;

    ratings.forEach(({ bookId, rating }) => {
      const book = this.books.find(b => b.id === bookId);
      if (!book) return;
      const w = rating / 5.0;
      const vec = this._bookVec(book);
      vec.forEach((v, i) => { sum[i] += v * w; });
      totalWeight += w;
    });

    if (totalWeight === 0) return null;
    return sum.map(v => v / totalWeight);
  }

  // ── Genre-interest seed vector (before any ratings) ─────────────────────

  _interestVector(selectedGenreIndices) {
    const g = new Float32Array(this.NUM_GENRES);
    selectedGenreIndices.forEach(i => { g[i] = 1; });
    const t = new Float32Array(this.NUM_THEMES).fill(0.2);
    return [...g, ...t, 0.6, 0.78];
  }

  // ── Main recommend function ─────────────────────────────────────────────

  recommend(ratings = [], selectedGenres = [], n = 12, excludeIds = []) {
    const excludeSet = new Set([...excludeIds, ...ratings.map(r => r.bookId)]);
    const candidates = this.books.filter(b => !excludeSet.has(b.id));

    // Build user vector
    let userVec = this.buildUserVector(ratings);
    if (!userVec && selectedGenres.length > 0) {
      userVec = this._interestVector(selectedGenres);
    }

    // No profile yet → return top-rated popular books
    if (!userVec) {
      return candidates
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, n)
        .map(b => ({ ...b, score: b.avgRating / 5, mlScore: 0, reason: 'Highly Rated', personaMatch: '' }));
    }

    // Content-based scores
    const candidateVecs = candidates.map(b => this._bookVec(b));
    const contentScores = this._batchCosineSim(userVec, candidateVecs);

    // Persona match for collaborative bonus
    const personaSims = this._personaCosineSim(userVec, this._personas);
    const personaSimArr = Array.isArray(personaSims) ? personaSims : [personaSims];
    const bestPersonaIdx = personaSimArr.indexOf(Math.max(...personaSimArr));
    const bestPersonaVec = this._personas[bestPersonaIdx];
    const personaScores = this._batchCosineSim(bestPersonaVec, candidateVecs);

    // Combine: 70% content + 30% collaborative
    const scored = candidates.map((book, i) => {
      const cs = contentScores[i] || 0;
      const ps = Array.isArray(personaScores) ? personaScores[i] : personaScores;
      const score = cs * 0.70 + (ps || 0) * 0.30;

      // Human-readable reason
      const gName = window.GENRE_NAMES[book.genres[0]] || 'book';
      let reason;
      if (cs > 0.75) reason = `Perfect match for your taste`;
      else if (cs > 0.55) reason = `You'll love this ${gName}`;
      else if (cs > 0.35) reason = `Expanding your ${gName} horizons`;
      else reason = `Readers like you enjoyed this`;

      return { ...book, score, mlScore: Math.round(cs * 100), reason,
               personaMatch: this._personaNames[bestPersonaIdx] };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, n);
  }

  // ── Find similar books ──────────────────────────────────────────────────

  getSimilar(bookId, n = 6) {
    const src = this.books.find(b => b.id === bookId);
    if (!src) return [];
    const srcVec = this._bookVec(src);
    const others = this.books.filter(b => b.id !== bookId);
    const otherVecs = others.map(b => this._bookVec(b));
    const sims = this._batchCosineSim(srcVec, otherVecs);
    return others
      .map((b, i) => ({ ...b, score: Array.isArray(sims) ? sims[i] : 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
  }

  getPersonaName(ratings, selectedGenres) {
    let userVec = this.buildUserVector(ratings);
    if (!userVec && selectedGenres.length > 0) userVec = this._interestVector(selectedGenres);
    if (!userVec) return 'Book Explorer';
    const sims = this._personaCosineSim(userVec, this._personas);
    const arr = Array.isArray(sims) ? sims : [sims];
    return this._personaNames[arr.indexOf(Math.max(...arr))];
  }
}

window.BookRecommender = BookRecommender;
