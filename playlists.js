// playlists.js — meets playlists.html requirements:
// sidebar "הספרייה שלי.", + new playlist modal, list playlists, play playlist,
// main shows selected playlist videos, internal filter, sort A-Z / rating,
// rate each video, delete single video or whole playlist, QueryString playlistId.
// :contentReference[oaicite:7]{index=7}

/* ---------------- AUTH (only logged-in users) ---------------- */
function getCurrentUser() {
  const raw = sessionStorage.getItem("currentUser");
  return raw ? JSON.parse(raw) : null;
}

function requireLogin() {
  const u = getCurrentUser();
  if (!u) {
    window.location.href = "login.html";
    return null;
  }
  return u;
}

function logout() {
  sessionStorage.removeItem("currentUser");
  window.location.href = "login.html";
}

const user = requireLogin();

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


console.log("currentUser (sessionStorage):", user);
console.log("All localStorage keys:", Object.keys(localStorage));

const key = playlistsKey();
console.log("Playlists key used:", key);
console.log("Playlists raw value:", localStorage.getItem(key));

document.getElementById("btnLogout").addEventListener("click", logout);

if (user) {
  const imgEl = document.getElementById("userImg");
  imgEl.src = user.imageUrl || "https://via.placeholder.com/40?text=U";
  imgEl.onerror = () => { imgEl.src = "https://via.placeholder.com/40?text=U"; };

  document.getElementById("welcomeText").textContent = `Hello ${user.firstName || user.username}`;
  document.getElementById("welcomeSub").textContent = `@${user.username}`;
}

function makeId() {
  return crypto?.randomUUID ? crypto.randomUUID() : `pl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/* ---------------- QueryString playlistId (required) ---------------- :contentReference[oaicite:8]{index=8} */
function getQS(name) {
  const p = new URLSearchParams(window.location.search);
  return p.get(name) || "";
}

function setQSPlaylist(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("playlistId", id);
  else url.searchParams.delete("playlistId");
  history.pushState({}, "", url);
}

window.addEventListener("popstate", () => {
  const id = getQS("playlistId");
  selectPlaylist(id, { pushQS: false });
});

/* ---------------- UI elements ---------------- */
const plListEl = document.getElementById("plList");
const plTitleEl = document.getElementById("plTitle");
const plMetaEl = document.getElementById("plMeta");
const emptyHintEl = document.getElementById("emptyHint");
const cardsEl = document.getElementById("cards");
const toolsRow = document.getElementById("toolsRow");

const btnPlayPlaylist = document.getElementById("btnPlayPlaylist");
const btnDeletePlaylist = document.getElementById("btnDeletePlaylist");

const filterInput = document.getElementById("filterInput");
const sortSelect = document.getElementById("sortSelect");
const btnClearFilter = document.getElementById("btnClearFilter");

/* new playlist modal */
const newPlaylistName = document.getElementById("newPlaylistName");
const btnCreatePlaylist = document.getElementById("btnCreatePlaylist");
const newPlMsg = document.getElementById("newPlMsg");
const newPlaylistModal = new bootstrap.Modal(document.getElementById("newPlaylistModal"));

function showNewPlMsg(text, type = "danger") {
  newPlMsg.className = `alert alert-${type}`;
  newPlMsg.textContent = text;
  newPlMsg.classList.remove("d-none");
}
function hideNewPlMsg() {
  newPlMsg.classList.add("d-none");
}

/* video modal */
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

/* ---------------- State ---------------- */
let playlists = loadPlaylists();
let currentPlaylistId = null;

/* ---------------- Render sidebar ---------------- */
function renderSidebar() {
  plListEl.innerHTML = "";

  if (playlists.length === 0) {
    plListEl.innerHTML = `<div class="text-muted small">No playlists yet. Create one.</div>`;
    return;
  }

  for (const pl of playlists) {
    const a = document.createElement("button");
    a.type = "button";
    a.className = `list-group-item list-group-item-action pl-item ${pl.id === currentPlaylistId ? "active" : ""}`;
    a.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div class="fw-semibold text-truncate" title="${escapeHtml(pl.name)}">${escapeHtml(pl.name)}</div>
        <span class="badge text-bg-light">${(pl.items || []).length}</span>
      </div>
    `;

    a.addEventListener("click", () => selectPlaylist(pl.id, { pushQS: true }));
    plListEl.appendChild(a);
  }
}

/* ---------------- Render main content ---------------- */
function renderMain() {
  const pl = playlists.find(p => p.id === currentPlaylistId) || null;

  if (!pl) {
    plTitleEl.textContent = "Playlists";
    plMetaEl.textContent = "";
    cardsEl.innerHTML = "";
    emptyHintEl.classList.remove("d-none"); // "בחר פלייליסט מהרשימה." :contentReference[oaicite:9]{index=9}
    toolsRow.style.display = "none";
    btnDeletePlaylist.disabled = true;
    btnPlayPlaylist.disabled = true;
    return;
  }

  emptyHintEl.classList.add("d-none");
  toolsRow.style.display = "";
  btnDeletePlaylist.disabled = false;
  btnPlayPlaylist.disabled = (pl.items || []).length === 0;

  plTitleEl.textContent = pl.name;
  plMetaEl.textContent = `${(pl.items || []).length} item(s)`;

  // filter + sort
  const filter = (filterInput.value || "").trim().toLowerCase();
  let items = [...(pl.items || [])];

  if (filter) {
    items = items.filter(it => (it.title || "").toLowerCase().includes(filter));
  }

  if (sortSelect.value === "az") {
    items.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  } else if (sortSelect.value === "rating") {
    items.sort((a, b) => (Number(b.rating || 0) - Number(a.rating || 0)) || (a.title || "").localeCompare(b.title || ""));
  }

  // cards
  cardsEl.innerHTML = "";

  if (items.length === 0) {
    cardsEl.innerHTML = `<div class="col-12"><div class="alert alert-warning m-0">No videos found in this playlist.</div></div>`;
    return;
  }

  for (const it of items) {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";

    const rating = Number(it.rating || 0);

    col.innerHTML = `
      <div class="card h-100 shadow-sm">
        <img class="thumb" src="${escapeAttr(it.thumb || "")}" alt="thumb">
        <div class="card-body d-flex flex-column">
          <h6 class="card-title line-clamp-2" title="${escapeAttr(it.title || "")}">${escapeHtml(it.title || "")}</h6>

          <div class="small text-muted mt-1">
            <div><i class="fa-regular fa-clock me-1"></i> Duration: <span class="fw-semibold">${escapeHtml(it.duration || "—")}</span></div>
            <div><i class="fa-regular fa-eye me-1"></i> Views: <span class="fw-semibold">${escapeHtml(it.views || "—")}</span></div>
          </div>

          <div class="mt-3">
            <div class="small fw-semibold mb-1">Your rating</div>
            <div class="d-flex gap-1 flex-wrap" data-vid="${escapeAttr(it.videoId)}">
              ${[1,2,3,4,5].map(n => `
                <button type="button" class="star-btn ${rating === n ? "active" : ""}" data-rate="${n}">
                  <i class="fa-solid fa-star"></i> ${n}
                </button>
              `).join("")}
            </div>
          </div>

          <div class="mt-auto d-flex gap-2 pt-3">
            <button class="btn btn-outline-primary btn-sm w-50 btnPlay">
              <i class="fa-solid fa-play me-1"></i> Play
            </button>
            <button class="btn btn-outline-danger btn-sm w-50 btnRemove">
              <i class="fa-solid fa-trash me-1"></i> Remove
            </button>
          </div>
        </div>
      </div>
    `;

    col.querySelector(".thumb").addEventListener("click", () => openPlayer(it.videoId, it.title));
    col.querySelector(".card-title").addEventListener("click", () => openPlayer(it.videoId, it.title));
    col.querySelector(".btnPlay").addEventListener("click", () => openPlayer(it.videoId, it.title));
    col.querySelector(".btnRemove").addEventListener("click", () => removeVideoFromPlaylist(it.videoId));

    // rating buttons
    const rateWrap = col.querySelector(`[data-vid="${cssEscape(it.videoId)}"]`);
    rateWrap.querySelectorAll(".star-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const r = Number(btn.dataset.rate);
        setRating(it.videoId, r);
      });
    });

    cardsEl.appendChild(col);
  }
}

/* ---------------- Actions ---------------- */
function selectPlaylist(id, opts = { pushQS: true }) {
  const pl = playlists.find(p => p.id === id) || null;

  if (!pl) {
    // if invalid id, fallback to first or none (required) :contentReference[oaicite:10]{index=10}
    if (playlists.length > 0) {
      currentPlaylistId = playlists[0].id;
      if (opts.pushQS) setQSPlaylist(currentPlaylistId);
    } else {
      currentPlaylistId = null;
      if (opts.pushQS) setQSPlaylist("");
    }
  } else {
    currentPlaylistId = id;
    if (opts.pushQS) setQSPlaylist(id);
  }

  renderSidebar();
  renderMain();
}

function createPlaylist(name) {
  const clean = name.trim();
  if (!clean) return { ok: false, msg: "Playlist name is required." };

  const exists = playlists.some(p => (p.name || "").toLowerCase() === clean.toLowerCase());
  if (exists) return { ok: false, msg: "Playlist name already exists." };

  const pl = { id: makeId(), name: clean, items: [] };
  playlists.push(pl);
  savePlaylists(playlists);
  return { ok: true, id: pl.id };
}

function deletePlaylist() {
  if (!currentPlaylistId) return;
  playlists = playlists.filter(p => p.id !== currentPlaylistId);
  savePlaylists(playlists);

  // select first by default if exists :contentReference[oaicite:11]{index=11}
  currentPlaylistId = playlists.length ? playlists[0].id : null;
  setQSPlaylist(currentPlaylistId || "");
  renderSidebar();
  renderMain();
}

function removeVideoFromPlaylist(videoId) {
  const pl = playlists.find(p => p.id === currentPlaylistId);
  if (!pl) return;

  pl.items = (pl.items || []).filter(it => it.videoId !== videoId);
  savePlaylists(playlists);

  renderSidebar();
  renderMain();
}

function setRating(videoId, rating) {
  const pl = playlists.find(p => p.id === currentPlaylistId);
  if (!pl) return;

  const it = (pl.items || []).find(x => x.videoId === videoId);
  if (!it) return;

  it.rating = rating; // required: support rating + sort by rating :contentReference[oaicite:12]{index=12}
  savePlaylists(playlists);

  renderMain();
}

btnDeletePlaylist.addEventListener("click", () => {
  if (!currentPlaylistId) return;
  const pl = playlists.find(p => p.id === currentPlaylistId);
  const name = pl ? pl.name : "this playlist";
  if (confirm(`Delete playlist "${name}"? This cannot be undone.`)) {
    deletePlaylist();
  }
});

btnPlayPlaylist.addEventListener("click", () => {
  const pl = playlists.find(p => p.id === currentPlaylistId);
  const first = pl?.items?.[0];
  if (first) openPlayer(first.videoId, first.title);
});

btnCreatePlaylist.addEventListener("click", () => {
  hideNewPlMsg();
  const name = newPlaylistName.value;

  const res = createPlaylist(name);
  if (!res.ok) {
    showNewPlMsg(res.msg, "danger");
    return;
  }

  showNewPlMsg("Playlist created ✅", "success");

  setTimeout(() => {
    newPlaylistModal.hide();
    newPlaylistName.value = "";
    hideNewPlMsg();
    selectPlaylist(res.id, { pushQS: true });
  }, 400);
});

filterInput.addEventListener("input", () => renderMain());
sortSelect.addEventListener("change", () => renderMain());
btnClearFilter.addEventListener("click", () => {
  filterInput.value = "";
  renderMain();
});

/* ---------------- Utilities ---------------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/`/g, "&#96;");
}
function cssEscape(s) {
  // simple escape for attribute selector usage
  return String(s).replace(/"/g, '\\"');
}

/* ---------------- Initial load ---------------- */
// if QueryString has playlistId => activate it; else load first playlist by default :contentReference[oaicite:13]{index=13}
(function init() {
  playlists = loadPlaylists();

  const id = getQS("playlistId");
  if (id) {
    selectPlaylist(id, { pushQS: false });
  } else {
    // default first playlist
    if (playlists.length) {
      currentPlaylistId = playlists[0].id;
      setQSPlaylist(currentPlaylistId);
    } else {
      currentPlaylistId = null;
      setQSPlaylist("");
    }
    renderSidebar();
    renderMain();
  }
  function refreshFromStorage() {
      playlists = loadPlaylists();
      renderSidebar();
      renderMain();
    }

    // When you return from Search -> Playlists, refresh automatically
    window.addEventListener("focus", refreshFromStorage);

    // Also refresh if localStorage changes (works when pages are open in different tabs)
    window.addEventListener("storage", refreshFromStorage);

})();
