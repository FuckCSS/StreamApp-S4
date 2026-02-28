/* ============================================================
   StreamApp — app.js
   Hash-based SPA: Search → Movie/TV page with episode cards
   ============================================================ */

const TMDB_KEY  = '3d421899d5ce93db8ad4ae4591ccc130';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p/w300';
const IMG_LARGE = 'https://image.tmdb.org/t/p/w500';
const IMG_STILL = 'https://image.tmdb.org/t/p/w400';

// ---- Source URL builders ----
const SOURCES = {
  alpha:    { movie: id => `https://vidsrc.cc/v2/embed/movie/${id}?autoPlay=false`,
              tv: (id,s,e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}?autoPlay=false` },
  bravo:    { movie: id => `https://vidsrc.cc/v3/embed/movie/${id}?autoPlay=false`,
              tv: (id,s,e) => `https://vidsrc.cc/v3/embed/tv/${id}/${s}/${e}?autoPlay=false` },
  charlie:  { movie: id => `https://moviesapi.club/movie/${id}`,
              tv: (id,s,e) => `https://moviesapi.club/tv/${id}-${s}-${e}` },
  delta:    { movie: id => `https://moviesapi.to/movie/${id}`,
              tv: (id,s,e) => `https://moviesapi.to/tv/${id}-${s}-${e}` },
  echo:     { movie: id => `https://vidsrc-embed.ru/embed/movie/${id}`,
              tv: (id,s,e) => `https://vidsrc-embed.ru/embed/tv/${id}/${s}-${e}` },
  foxtrot:  { movie: id => `https://vidsrc-embed.su/embed/movie/${id}`,
              tv: (id,s,e) => `https://vidsrc-embed.su/embed/tv/${id}/${s}-${e}` },
  golf:     { movie: id => `https://vidsrcme.su/embed/movie/${id}`,
              tv: (id,s,e) => `https://vidsrcme.su/embed/tv/${id}/${s}-${e}` },
  hotel:    { movie: id => `https://vsrc.su/embed/movie/${id}`,
              tv: (id,s,e) => `https://vsrc.su/embed/tv/${id}/${s}-${e}` },
  india:    { movie: id => `https://player.videasy.net/movie/${id}?color=6366f1`,
              tv: (id,s,e) => `https://player.videasy.net/tv/${id}/${s}/${e}?nextEpisode=true&episodeSelector=true&color=6366f1` },
  juliet:   { movie: id => `https://player.videasy.net/movie/${id}?overlay=true&color=6366f1`,
              tv: (id,s,e) => `https://player.videasy.net/tv/${id}/${s}/${e}?overlay=true&nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&color=6366f1` },
  kilo:     { movie: id => `https://vidfast.pro/movie/${id}?autoPlay=false`,
              tv: (id,s,e) => `https://vidfast.pro/tv/${id}/${s}/${e}?autoPlay=false&nextButton=true&autoNext=true` },
  lima:     { movie: id => `https://vidfast.in/movie/${id}?autoPlay=false`,
              tv: (id,s,e) => `https://vidfast.in/tv/${id}/${s}/${e}?autoPlay=false&nextButton=true&autoNext=true` },
  mike:     { movie: id => `https://vidfast.io/movie/${id}?autoPlay=false`,
              tv: (id,s,e) => `https://vidfast.io/tv/${id}/${s}/${e}?autoPlay=false&nextButton=true&autoNext=true` },
  november: { movie: id => `https://vidfast.me/movie/${id}?autoPlay=false`,
              tv: (id,s,e) => `https://vidfast.me/tv/${id}/${s}/${e}?autoPlay=false&nextButton=true&autoNext=true` },
  oscar:    { movie: id => `https://vidfast.net/movie/${id}?autoPlay=false`,
              tv: (id,s,e) => `https://vidfast.net/tv/${id}/${s}/${e}?autoPlay=false&nextButton=true&autoNext=true` },
  papa:     { movie: id => `https://vidfast.pm/movie/${id}?autoPlay=false`,
              tv: (id,s,e) => `https://vidfast.pm/tv/${id}/${s}/${e}?autoPlay=false&nextButton=true&autoNext=true` },
  quebec:   { movie: id => `https://vidfast.xyz/movie/${id}?autoPlay=false`,
              tv: (id,s,e) => `https://vidfast.xyz/tv/${id}/${s}/${e}?autoPlay=false&nextButton=true&autoNext=true` },
  romeo:    { movie: id => `https://vidlink.pro/movie/${id}?autoplay=false&title=true&poster=true`,
              tv: (id,s,e) => `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=false&title=true&poster=true&nextbutton=true` },
  sierra:   { movie: id => `https://vidlink.pro/movie/${id}?autoplay=false&title=true&poster=true&player=jw`,
              tv: (id,s,e) => `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=false&title=true&poster=true&nextbutton=true&player=jw` },
};

// ---- State ----
let currentQuery   = '';
let currentPage    = 1;
let totalPages     = 1;
let allResults     = [];
let mediaCache     = {};   // id -> TMDB detail
let seasonCache    = {};   // "id-s" -> season data
let activeMediaId  = null;
let activeType     = null; // 'movie' | 'tv'
let activeSeason   = 1;
let activeEpisode  = 1;

// ---- localStorage helpers ----
function getSavedSource() { return localStorage.getItem('sa_source') || 'alpha'; }
function saveSource(v)    { localStorage.setItem('sa_source', v); }
function isUblockDismissed() { return localStorage.getItem('sa_ublock') === '1'; }
function dismissUblock()     { localStorage.setItem('sa_ublock', '1'); }

// ---- DOM refs ----
const viewSearch       = document.getElementById('view-search');
const viewMedia        = document.getElementById('view-media');
const searchForm       = document.getElementById('search-form');
const searchInput      = document.getElementById('search-input');
const resultsSection   = document.getElementById('results-section');
const resultsGrid      = document.getElementById('results-grid');
const resultsCount     = document.getElementById('results-count');
const loadMoreWrap     = document.getElementById('load-more-wrap');
const loadMoreBtn      = document.getElementById('load-more-btn');
const stateEmpty       = document.getElementById('state-empty');
const stateLoading     = document.getElementById('state-loading');
const stateError       = document.getElementById('state-error');
const errorText        = document.getElementById('error-text');

const ublockBanner     = document.getElementById('ublock-banner');
const ublockDismiss    = document.getElementById('ublock-dismiss');
const mediaPoster      = document.getElementById('media-poster');
const mediaPosterPh    = document.getElementById('media-poster-ph');
const mediaBadge       = document.getElementById('media-badge');
const mediaYear        = document.getElementById('media-year');
const mediaRating      = document.getElementById('media-rating');
const mediaGenres      = document.getElementById('media-genres');
const mediaTitle       = document.getElementById('media-title');
const mediaOverview    = document.getElementById('media-overview');
const sourceSelect     = document.getElementById('media-source-select');
const newtabBtn        = document.getElementById('newtab-btn');
const playerIframe     = document.getElementById('player-iframe');
const iframeSpinner    = document.getElementById('iframe-spinner');
const tvSection        = document.getElementById('tv-section');
const seasonTabs       = document.getElementById('season-tabs');
const episodeGrid      = document.getElementById('episode-grid');
const episodesLoading  = document.getElementById('episodes-loading');

// ============================================================
// Router
// ============================================================
function route() {
  const hash = window.location.hash || '#/';
  const parts = hash.replace('#/', '').split('/');

  if (parts[0] === 'movie' && parts[1]) {
    showMediaView('movie', parts[1]);
  } else if (parts[0] === 'tv' && parts[1]) {
    const s = parseInt(parts[2]) || 1;
    const e = parseInt(parts[3]) || 1;
    showMediaView('tv', parts[1], s, e);
  } else {
    showSearchView();
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);

// ============================================================
// View Switching
// ============================================================
function showSearchView() {
  viewSearch.classList.remove('hidden');
  viewMedia.classList.add('hidden');
  playerIframe.src = '';
  activeMediaId = null;
  document.title = 'StreamApp — Watch Movies & TV';
  window.scrollTo(0, 0);
}

async function showMediaView(type, id, s = 1, e = 1) {
  viewSearch.classList.add('hidden');
  viewMedia.classList.remove('hidden');
  window.scrollTo(0, 0);

  activeMediaId = id;
  activeType    = type;
  activeSeason  = s;
  activeEpisode = e;

  // uBlock banner
  if (isUblockDismissed()) {
    ublockBanner.classList.add('hidden');
  } else {
    ublockBanner.classList.remove('hidden');
  }

  // Source from localStorage
  sourceSelect.value = getSavedSource();

  // Fetch details
  try {
    const detail = await fetchDetail(type, id);
    renderMediaHeader(type, detail);

    if (type === 'tv') {
      tvSection.classList.remove('hidden');
      renderSeasonTabs(detail, s);
      await loadSeason(id, s, e);
    } else {
      tvSection.classList.add('hidden');
    }

    loadPlayer();
  } catch (err) {
    console.error(err);
    mediaTitle.textContent = 'Failed to load';
    mediaOverview.textContent = 'Could not fetch details from TMDB.';
  }
}

// ============================================================
// TMDB Fetching
// ============================================================
async function fetchDetail(type, id) {
  const key = `${type}-${id}`;
  if (mediaCache[key]) return mediaCache[key];
  const url = `${TMDB_BASE}/${type}/${id}?api_key=${TMDB_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const data = await res.json();
  mediaCache[key] = data;
  return data;
}

async function fetchSeason(tvId, seasonNum) {
  const key = `${tvId}-${seasonNum}`;
  if (seasonCache[key]) return seasonCache[key];
  const url = `${TMDB_BASE}/tv/${tvId}/season/${seasonNum}?api_key=${TMDB_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB season ${res.status}`);
  const data = await res.json();
  seasonCache[key] = data;
  return data;
}

// ============================================================
// Render Media Header
// ============================================================
function renderMediaHeader(type, detail) {
  const isTV   = type === 'tv';
  const title  = isTV ? detail.name : detail.title;
  const date   = isTV ? detail.first_air_date : detail.release_date;
  const year   = date ? date.slice(0, 4) : '';
  const poster = detail.poster_path ? `${IMG_LARGE}${detail.poster_path}` : null;
  const rating = detail.vote_average ? detail.vote_average.toFixed(1) : null;
  const genres = (detail.genres || []).map(g => g.name).join(', ');

  document.title = `${title} — StreamApp`;

  if (poster) {
    mediaPoster.src = poster;
    mediaPoster.alt = title;
    mediaPoster.classList.remove('hidden');
    mediaPosterPh.classList.add('hidden');
  } else {
    mediaPoster.classList.add('hidden');
    mediaPosterPh.classList.remove('hidden');
    mediaPosterPh.textContent = title;
  }

  mediaBadge.textContent = isTV ? 'TV Show' : 'Movie';
  mediaBadge.className   = `modal-badge ${isTV ? 'badge-tv' : 'badge-movie'}`;
  mediaYear.textContent  = year;
  mediaRating.textContent = rating ? `⭐ ${rating}` : '';
  mediaGenres.textContent = genres;
  mediaTitle.textContent  = title;
  mediaOverview.textContent = detail.overview || 'No description available.';
}

// ============================================================
// Season Tabs
// ============================================================
function renderSeasonTabs(detail, activeSNum) {
  seasonTabs.innerHTML = '';
  const seasons = (detail.seasons || []).filter(s => s.season_number > 0);

  seasons.forEach(s => {
    const btn = document.createElement('button');
    btn.className = `season-tab ${s.season_number === activeSNum ? 'season-tab-active' : ''}`;
    btn.textContent = `Season ${s.season_number}`;
    btn.addEventListener('click', () => {
      if (s.season_number === activeSeason) return;
      activeSeason  = s.season_number;
      activeEpisode = 1;
      updateHash();
      document.querySelectorAll('.season-tab').forEach(t => t.classList.remove('season-tab-active'));
      btn.classList.add('season-tab-active');
      loadSeason(activeMediaId, s.season_number, 1);
    });
    seasonTabs.appendChild(btn);
  });
}

// ============================================================
// Episode Grid
// ============================================================
async function loadSeason(tvId, seasonNum, highlightEp) {
  episodeGrid.innerHTML = '';
  episodesLoading.classList.remove('hidden');

  try {
    const season = await fetchSeason(tvId, seasonNum);
    episodesLoading.classList.add('hidden');
    renderEpisodes(season.episodes || [], highlightEp);
  } catch (err) {
    episodesLoading.classList.add('hidden');
    episodeGrid.innerHTML = '<p class="text-gray-400 text-sm" style="padding:1rem;">Failed to load episodes.</p>';
  }
}

function renderEpisodes(episodes, highlightEp) {
  episodeGrid.innerHTML = '';

  episodes.forEach(ep => {
    const card = document.createElement('div');
    const isActive = ep.episode_number === highlightEp;
    card.className = `ep-card ${isActive ? 'ep-card-active' : ''}`;
    card.setAttribute('data-ep', ep.episode_number);

    const still = ep.still_path ? `${IMG_STILL}${ep.still_path}` : null;

    card.innerHTML = `
      <div class="ep-thumb-wrap">
        ${still
          ? `<img class="ep-thumb" src="${still}" alt="" loading="lazy" />`
          : `<div class="ep-thumb-ph"><svg viewBox="0 0 32 32" fill="none" width="28" height="28"><polygon points="12,8 24,16 12,24" fill="#374151"/></svg></div>`
        }
        <span class="ep-number">E${ep.episode_number}</span>
      </div>
      <div class="ep-info">
        <div class="ep-title">${escapeHtml(ep.name || `Episode ${ep.episode_number}`)}</div>
        <div class="ep-desc">${escapeHtml(ep.overview || '')}</div>
      </div>
    `;

    card.addEventListener('click', () => {
      activeEpisode = ep.episode_number;
      updateHash();
      loadPlayer();
      // Update active state
      document.querySelectorAll('.ep-card').forEach(c => c.classList.remove('ep-card-active'));
      card.classList.add('ep-card-active');
      // Scroll player into view
      document.querySelector('.player-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    episodeGrid.appendChild(card);
  });
}

// ============================================================
// Player
// ============================================================
function buildSrc() {
  const src = SOURCES[sourceSelect.value] || SOURCES.alpha;
  if (activeType === 'tv') {
    return src.tv(activeMediaId, activeSeason, activeEpisode);
  }
  return src.movie(activeMediaId);
}

function loadPlayer() {
  iframeSpinner.classList.remove('hidden');
  playerIframe.src = '';
  requestAnimationFrame(() => {
    playerIframe.src = buildSrc();
  });
}

playerIframe.addEventListener('load', () => {
  iframeSpinner.classList.add('hidden');
});

// Source change
sourceSelect.addEventListener('change', () => {
  saveSource(sourceSelect.value);
  if (activeMediaId) loadPlayer();
});

// Open in new tab
newtabBtn.addEventListener('click', () => {
  if (activeMediaId) window.open(buildSrc(), '_blank', 'noopener,noreferrer');
});

// uBlock dismiss
ublockDismiss.addEventListener('click', () => {
  dismissUblock();
  ublockBanner.classList.add('hidden');
});

// ============================================================
// Hash helpers
// ============================================================
function updateHash() {
  if (activeType === 'tv') {
    window.location.hash = `#/tv/${activeMediaId}/${activeSeason}/${activeEpisode}`;
  } else {
    window.location.hash = `#/movie/${activeMediaId}`;
  }
}

// ============================================================
// Search
// ============================================================
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) return;
  currentQuery = q;
  currentPage  = 1;
  allResults   = [];
  doSearch(true);
});

loadMoreBtn.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    doSearch(false);
  }
});

async function doSearch(reset) {
  showState('loading');
  try {
    const url  = `${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(currentQuery)}&page=${currentPage}&include_adult=false`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
    const data = await res.json();

    totalPages = data.total_pages || 1;
     const filtered = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv').sort((a, b) => b.popularity - a.popularity);

    if (reset) allResults = filtered;
    else       allResults = allResults.concat(filtered);

    hideAllStates();

    if (allResults.length === 0) { showState('empty'); return; }

    resultsSection.classList.remove('hidden');
    resultsCount.textContent = `${data.total_results.toLocaleString()} result${data.total_results !== 1 ? 's' : ''} for "${currentQuery}"`;

    if (reset) resultsGrid.innerHTML = '';
    renderCards(filtered);

    if (currentPage < totalPages) loadMoreWrap.classList.remove('hidden');
    else                          loadMoreWrap.classList.add('hidden');

  } catch (err) {
    console.error(err);
    showState('error');
    errorText.textContent = 'Could not reach TMDB. Check your connection and try again.';
  }
}

function renderCards(items) {
  items.forEach(item => {
    const isTV   = item.media_type === 'tv';
    const title  = isTV ? item.name  : item.title;
    const date   = isTV ? item.first_air_date : item.release_date;
    const year   = date ? date.slice(0, 4) : '';
    const poster = item.poster_path ? `${IMG_BASE}${item.poster_path}` : null;

    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${title}${year ? ' (' + year + ')' : ''}`);

    card.innerHTML = `
      <div class="card-poster-wrap">
        ${poster
          ? `<img class="card-poster" src="${poster}" alt="${escapeHtml(title)}" loading="lazy" />`
          : `<div class="card-placeholder">${escapeHtml(title)}</div>`
        }
        <span class="card-type-badge ${isTV ? 'badge-tv' : 'badge-movie'}">${isTV ? 'TV' : 'Movie'}</span>
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(title)}</div>
        ${year ? `<div class="card-year">${year}</div>` : ''}
      </div>
    `;

    const target = isTV ? `#/tv/${item.id}/1/1` : `#/movie/${item.id}`;
    card.addEventListener('click', () => { window.location.hash = target; });
    card.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); window.location.hash = target; }
    });

    resultsGrid.appendChild(card);
  });
}

// ============================================================
// State helpers
// ============================================================
function hideAllStates() {
  stateEmpty.classList.add('hidden');
  stateLoading.classList.add('hidden');
  stateError.classList.add('hidden');
}

function showState(state) {
  hideAllStates();
  resultsSection.classList.add('hidden');
  if (state === 'loading') stateLoading.classList.remove('hidden');
  if (state === 'empty')   stateEmpty.classList.remove('hidden');
  if (state === 'error')   stateError.classList.remove('hidden');
}

// ============================================================
// Escape key
// ============================================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeMediaId) {
    window.location.hash = '#/';
  }
});

// ============================================================
// Utility
// ============================================================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}