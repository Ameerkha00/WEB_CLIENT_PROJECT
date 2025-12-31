// =====================
// CONFIG
// =====================
// Put your YouTube Data API key here:
const YT_API_KEY = "AIzaSyDwcCkkjccyadOO1jAaWxJKG8-rHofVbaM";

// =====================
// AUTH (required: only logged-in users)  :contentReference[oaicite:2]{index=2}
// =====================
function getCurrentUser() {
  const raw = sessionStorage.getItem("currentUser");
  return raw ? JSON.parse(raw) : null;
}

function requireLogin() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

function logout() {
  sessionStorage.removeItem("currentUser");
  window.location.href = "login.html";
}

const user = requireLogin();
if (user) {
  document.getElementById("userImg").src = user.imageUrl;
  document.getElementById("welcomeText").textContent = `Hello ${user.firstName || user.username}`;
  document.getElementById("welcomeSub").textContent = `@${user.username}`;
}
document.getElementById("btnLogout").addEventListener("click", logout);

// =====================
// UI helpers
// =====================
const qInput = document.getElementById("q");
const btnSearch = document.getElementById("btnSearch");
const resultsEl = document.getElementById("results");
const msgEl = document.getElementById("msg");

function showMsg(text, type = "danger") {
  msgEl.className = `alert alert-${type} mt-3`;
  msgEl.textContent = text;
  msgEl.classList.remove("d-none");
}
function hideMsg() {
  msgEl.classList.add("d-none");
}

function formatDuration(iso) {
  // basic PT#H#M#S parser
  const h = (iso.match(/(\d+)H/) || [])[1] || 0;
  const m = (iso.match(/(\d+)M/) || [])[1] || 0;
  const s = (iso.match(/(\d+)S/) || [])[1] || 0;
  const hh = Number(h);
  const mm = String(m).padStart(hh ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return hh ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatNumber(n) {
  const x = Number(n || 0);
  return x.toLocaleString();
}

// =====================
// QueryString sync (required) :contentReference[oaicite:3]{index=3}
// - load page with params -> do search
// - searching updates QueryString
// - back navigation restores state
// =====================
function getQS(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || "";
}

function setQS(q) {
  const url = new URL(window.location.href);
  if (q) url.searchParams.set("q", q);
  else url.searchParams.delete("q");
  history.pushState({}, "", url);
}

// Restore on back/forward
window.addEventListener("popstate", () => {
  const q = getQS("q");
  qInput.value = q;
  if (q) runSearch(q);
  else resultsEl.innerHTML = "";
});

// =====================
// YouTube API calls (required) :contentReference[oaicite:4]{index=4}
// =====================
async function ytSearch(query) {
  const url =
    "https://www.googleapis.com/youtube/v3/search" +
    `?part=snippet&type=video&maxResults=12&q=${encodeURIComponent(query)}&key=${YT_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "YouTube search failed");
  return data.items || [];
}

async function ytDetails(videoIds) {
  if (!videoIds.length) return [];
  const url =
    "https://www.googleapis.com/youtube/v3/videos" +
    `?part=contentDetails,statistics&id=${videoIds.join(",")}&key=${YT_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "YouTube details failed");
  return data.items || [];
}

// =====================
// Playlists storage (favorites) — needed for “add to favorites” :contentReference[oaicite:5]{index=5}
// We store per user: playlists_<username>
// structure: [{id,name,items:[{videoId,title,thumb,duration,views}]}]
// =====================
function userKeyName() {
  return (user.username || "").trim().toLowerCase();
}

function playlistsKey() {
  return `playlists_${userKeyName()}`;
}

function loadPlaylists() {
  try {
    return JSON.parse(localStorage.getItem(playlistsKey())) || [];
  } catch {
    return [];
  }
}

function savePlaylists(pl) {
  localStorage.setItem(playlistsKey(), JSON.stringify(pl));
}


function makeId() {
  return crypto?.randomUUID ? crypto.randomUUID() : `pl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// =====================
// Modal player (required) :contentReference[oaicite:6]{index=6}
// =====================
const videoModal = new bootstrap.Modal(document.getElementById("videoModal"));
const playerFrame = document.getElementById("playerFrame");
const modalTitle = document.getElementById("modalTitle");

function openPlayer(videoId, title) {
  modalTitle.textContent = title || "Player";
  playerFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  videoModal.show();
}
document.getElementById("videoModal").addEventListener("hidden.bs.modal", () => {
  playerFrame.src = "";
});

// =====================
// Add-to-playlist modal (required) :contentReference[oaicite:7]{index=7}
// =====================
const favModal = new bootstrap.Modal(document.getElementById("favModal"));
const favInfo = document.getElementById("favInfo");
const playlistSelect = document.getElementById("playlistSelect");
const newPlaylistName = document.getElementById("newPlaylistName");
const favMsg = document.getElementById("favMsg");
const btnAddFav = document.getElementById("btnAddFav");

let pendingVideo = null;

function showFavMsg(text, type = "danger") {
  favMsg.className = `alert alert-${type} d-block`;
  favMsg.textContent = text;
  favMsg.classList.remove("d-none");
}

function hideFavMsg() {
  favMsg.classList.add("d-none");
}

function openFavModal(videoObj) {
  pendingVideo = videoObj;
  hideFavMsg();
  newPlaylistName.value = "";

  favInfo.textContent = `${videoObj.title}`;

  const playlists = loadPlaylists();
  playlistSelect.innerHTML = "";

  if (playlists.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No playlists yet — create one below";
    playlistSelect.appendChild(opt);
  } else {
    for (const pl of playlists) {
      const opt = document.createElement("option");
      opt.value = pl.id;
      opt.textContent = pl.name;
      playlistSelect.appendChild(opt);
    }
  }

  favModal.show();
}

btnAddFav.addEventListener("click", () => {
  if (!pendingVideo) return;

  const playlists = loadPlaylists();
  const chosenId = playlistSelect.value;
  const newName = newPlaylistName.value.trim();

  // Create playlist if needed
  let target = null;

  if (newName) {
    target = { id: makeId(), name: newName, items: [] };
    playlists.push(target);
  } else {
    target = playlists.find(p => p.id === chosenId) || null;
  }

  if (!target) {
    showFavMsg("Choose a playlist or type a new playlist name.", "danger");
    return;
  }

  // Prevent duplicates in same playlist
  if (target.items.some(it => it.videoId === pendingVideo.videoId)) {
    showFavMsg("This video is already in that playlist.", "warning");
    return;
  }

  target.items.push(pendingVideo);
  savePlaylists(playlists);

  showFavMsg("Added to playlist ✅", "success");
  setTimeout(() => favModal.hide(), 700);
});

// =====================
// Render results as cards (required) :contentReference[oaicite:8]{index=8}
// =====================
function renderResults(items, detailsMap) {
  resultsEl.innerHTML = "";

  if (!items.length) {
    showMsg("No results found.", "warning");
    return;
  }

  hideMsg();

  for (const it of items) {
    const videoId = it.id?.videoId;
    if (!videoId) continue;

    const title = it.snippet?.title || "";
    const thumb = it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || "";

    const det = detailsMap.get(videoId);
    const duration = det ? formatDuration(det.contentDetails?.duration || "PT0S") : "—";
    const views = det ? formatNumber(det.statistics?.viewCount || 0) : "—";

    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";

    // title tooltip if truncated (we always set title attr; browser shows tooltip)
    col.innerHTML = `
      <div class="card h-100 shadow-sm">
        <img class="thumb" src="${thumb}" alt="thumb">
        <div class="card-body d-flex flex-column">
          <h6 class="card-title line-clamp-2" title="${title.replaceAll('"', "&quot;")}">${title}</h6>

          <div class="small text-muted mt-1">
            <div><i class="fa-regular fa-clock me-1"></i> Duration: <span class="fw-semibold">${duration}</span></div>
            <div><i class="fa-regular fa-eye me-1"></i> Views: <span class="fw-semibold">${views}</span></div>
          </div>

          <div class="mt-auto d-flex gap-2 pt-3">
            <button class="btn btn-outline-primary btn-sm w-50 btnPlay">
              <i class="fa-solid fa-play me-1"></i> Play
            </button>
            <button class="btn btn-outline-success btn-sm w-50 btnFav">
              <i class="fa-solid fa-star me-1"></i> Favorite
            </button>
          </div>
        </div>
      </div>
    `;

    col.querySelector(".thumb").addEventListener("click", () => openPlayer(videoId, title));
    col.querySelector(".card-title").addEventListener("click", () => openPlayer(videoId, title));
    col.querySelector(".btnPlay").addEventListener("click", () => openPlayer(videoId, title));
    col.querySelector(".btnFav").addEventListener("click", () => {
      openFavModal({ videoId, title, thumb, duration, views });
    });

    resultsEl.appendChild(col);
  }
}

// =====================
// Main search flow (required) :contentReference[oaicite:9]{index=9}
// =====================
async function runSearch(query) {
  if (!YT_API_KEY || YT_API_KEY.trim().length < 10) {
    showMsg("Missing YouTube API key in search.js (YT_API_KEY).", "danger");
    return;
  }

  try {
    showMsg("Searching...", "info");

    const items = await ytSearch(query);
    const ids = items.map(x => x.id?.videoId).filter(Boolean);

    const details = await ytDetails(ids);
    const detailsMap = new Map(details.map(d => [d.id, d]));

    // save state so “back navigation shows as it was” :contentReference[oaicite:10]{index=10}
    sessionStorage.setItem("searchState", JSON.stringify({ q: query, items, details }));

    renderResults(items, detailsMap);
  } catch (err) {
    console.error(err);
    showMsg(err.message || "Search failed.", "danger");
  }
}

btnSearch.addEventListener("click", () => {
  const q = qInput.value.trim();
  setQS(q); // update QueryString (required) :contentReference[oaicite:11]{index=11}
  if (q) runSearch(q);
  else resultsEl.innerHTML = "";
});

qInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    btnSearch.click();
  }
});

// Initial load: if q in QueryString -> auto search (required) :contentReference[oaicite:12]{index=12}
(() => {
  const q = getQS("q");
  qInput.value = q;

  // Restore from sessionStorage if possible
  const raw = sessionStorage.getItem("searchState");
  if (raw) {
    try {
      const state = JSON.parse(raw);
      if (state?.q && state.q === q && Array.isArray(state.items) && Array.isArray(state.details)) {
        const map = new Map(state.details.map(d => [d.id, d]));
        renderResults(state.items, map);
        hideMsg();
        return;
      }
    } catch {}
  }

  if (q) runSearch(q);
})();
