import { requireLogin, logout } from "./auth.js";

const user = requireLogin();
if (!user) throw new Error("Not logged in");

// HEADER
const userImg = document.getElementById("userImg");
const welcomeText = document.getElementById("welcomeText");
const welcomeSub = document.getElementById("welcomeSub");
const btnLogout = document.getElementById("btnLogout");

userImg.src = user.imageUrl || "";
userImg.onerror = () => { userImg.src = "https://via.placeholder.com/40?text=U"; };
welcomeText.textContent = `Hello ${user.firstName || user.username}`;
welcomeSub.textContent = `@${user.username}`;
btnLogout.addEventListener("click", logout);

// ELEMENTS
const plListEl = document.getElementById("plList");
const cardsEl = document.getElementById("cards");
const plTitleEl = document.getElementById("plTitle");
const plMetaEl = document.getElementById("plMeta");
const emptyHintEl = document.getElementById("emptyHint");
const toolsRow = document.getElementById("toolsRow");

const btnDeletePlaylist = document.getElementById("btnDeletePlaylist");
const btnPlayPlaylist = document.getElementById("btnPlayPlaylist");

const filterInput = document.getElementById("filterInput");
const sortSelect = document.getElementById("sortSelect");
const btnClearFilter = document.getElementById("btnClearFilter");

// NEW PLAYLIST MODAL
const newPlaylistModalEl = document.getElementById("newPlaylistModal");
const newPlaylistModal = new bootstrap.Modal(newPlaylistModalEl);
const newPlaylistName = document.getElementById("newPlaylistName");
const btnCreatePlaylist = document.getElementById("btnCreatePlaylist");
const newPlMsg = document.getElementById("newPlMsg");

function showNewPlMsg(text, type = "danger") {
  newPlMsg.className = `alert alert-${type} mt-3`;
  newPlMsg.textContent = text;
  newPlMsg.classList.remove("d-none");
}
function hideNewPlMsg() {
  newPlMsg.classList.add("d-none");
}

// VIDEO MODAL
const videoModalEl = document.getElementById("videoModal");
const videoModal = new bootstrap.Modal(videoModalEl);
const playerFrame = document.getElementById("playerFrame");
const modalTitle = document.getElementById("modalTitle");

function openPlayer(videoId, title) {
  modalTitle.textContent = title || "Player";
  playerFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  videoModal.show();
}
videoModalEl.addEventListener("hidden.bs.modal", () => {
  playerFrame.src = "";
});

// API
async function apiGetPlaylists() {
  const res = await fetch(`/api/playlists/${encodeURIComponent(user.username)}`);
  if (!res.ok) throw new Error("Failed to load playlists");
  return await res.json();
}
async function apiSavePlaylists(playlists) {
  const res = await fetch(`/api/playlists/${encodeURIComponent(user.username)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(playlists)
  });
  if (!res.ok) throw new Error("Failed to save playlists");
}

// STATE
let playlists = [];
let currentPlaylistId = null;

// RENDER SIDEBAR
function renderSidebar() {
  plListEl.innerHTML = "";

  if (!playlists.length) {
    plListEl.innerHTML = `<div class="text-muted small">No playlists yet. Create one.</div>`;
    return;
  }

  for (const pl of playlists) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `list-group-item list-group-item-action ${pl.id === currentPlaylistId ? "active" : ""}`;
    btn.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div class="fw-semibold text-truncate">${escapeHtml(pl.name)}</div>
        <span class="badge text-bg-light">${(pl.items || []).length}</span>
      </div>
    `;
    btn.addEventListener("click", () => selectPlaylist(pl.id));
    plListEl.appendChild(btn);
  }
}

// RENDER MAIN
function renderMain() {
  const pl = playlists.find(p => p.id === currentPlaylistId) || null;

  if (!pl) {
    plTitleEl.textContent = "Playlists";
    plMetaEl.textContent = "";
    cardsEl.innerHTML = "";
    emptyHintEl.classList.remove("d-none");
    toolsRow.style.display = "none";
    btnDeletePlaylist.disabled = true;
    btnPlayPlaylist.disabled = true;
    return;
  }

  emptyHintEl.classList.add("d-none");
  toolsRow.style.display = "";
  btnDeletePlaylist.disabled = false;
  btnPlayPlaylist.disabled = !(pl.items || []).length;

  plTitleEl.textContent = pl.name;
  plMetaEl.textContent = `${(pl.items || []).length} item(s)`;

  // filter + sort
  const filter = (filterInput.value || "").trim().toLowerCase();
  let items = [...(pl.items || [])];

  if (filter) items = items.filter(it => (it.title || "").toLowerCase().includes(filter));

  if (sortSelect.value === "az") {
    items.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  } else if (sortSelect.value === "rating") {
    items.sort((a, b) => (Number(b.rating || 0) - Number(a.rating || 0)) || (a.title || "").localeCompare(b.title || ""));
  }

  cardsEl.innerHTML = "";

  if (!items.length) {
    cardsEl.innerHTML = `<div class="col-12"><div class="alert alert-warning m-0">No videos found in this playlist.</div></div>`;
    return;
  }

  for (const it of items) {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";

    const rating = Number(it.rating || 0);

    col.innerHTML = `
      <div class="card h-100 shadow-sm hover-card">
        <img class="thumb" src="${escapeAttr(it.thumb || "")}" alt="thumb">
        <div class="card-body d-flex flex-column">
          <h6 class="card-title line-clamp-2">${escapeHtml(it.title || "")}</h6>

          <div class="mt-3">
            <div class="small fw-semibold mb-1">Your rating</div>
            <div class="d-flex gap-1 flex-wrap">
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

    col.querySelector(".btnPlay").addEventListener("click", () => openPlayer(it.videoId, it.title));
    col.querySelector(".thumb").addEventListener("click", () => openPlayer(it.videoId, it.title));
    col.querySelector(".btnRemove").addEventListener("click", () => removeVideo(it.videoId));

    col.querySelectorAll(".star-btn").forEach(btn => {
      btn.addEventListener("click", () => setRating(it.videoId, Number(btn.dataset.rate)));
    });

    cardsEl.appendChild(col);
  }
}

// ACTIONS
function selectPlaylist(id) {
  currentPlaylistId = id;
  renderSidebar();
  renderMain();
}

async function removeVideo(videoId) {
  const pl = playlists.find(p => p.id === currentPlaylistId);
  if (!pl) return;
  pl.items = (pl.items || []).filter(v => v.videoId !== videoId);
  await apiSavePlaylists(playlists);
  renderSidebar();
  renderMain();
}

async function setRating(videoId, rating) {
  const pl = playlists.find(p => p.id === currentPlaylistId);
  if (!pl) return;

  const it = (pl.items || []).find(v => v.videoId === videoId);
  if (!it) return;

  it.rating = rating;
  await apiSavePlaylists(playlists);
  renderMain();
}

btnDeletePlaylist.addEventListener("click", async () => {
  const pl = playlists.find(p => p.id === currentPlaylistId);
  if (!pl) return;

  if (!confirm(`Delete playlist "${pl.name}"?`)) return;

  playlists = playlists.filter(p => p.id !== currentPlaylistId);
  currentPlaylistId = playlists.length ? playlists[0].id : null;

  await apiSavePlaylists(playlists);
  renderSidebar();
  renderMain();
});

btnPlayPlaylist.addEventListener("click", () => {
  const pl = playlists.find(p => p.id === currentPlaylistId);
  const first = pl?.items?.[0];
  if (first) openPlayer(first.videoId, first.title);
});

btnCreatePlaylist.addEventListener("click", async () => {
  hideNewPlMsg();
  const name = newPlaylistName.value.trim();
  if (!name) {
    showNewPlMsg("Playlist name is required.");
    return;
  }

  if (playlists.some(p => (p.name || "").toLowerCase() === name.toLowerCase())) {
    showNewPlMsg("Playlist name already exists.");
    return;
  }

  const pl = {
    id: crypto?.randomUUID ? crypto.randomUUID() : `pl_${Date.now()}`,
    name,
    items: []
  };

  playlists.push(pl);
  await apiSavePlaylists(playlists);

  newPlaylistName.value = "";
  showNewPlMsg("Playlist created ✅", "success");

  setTimeout(() => {
    newPlaylistModal.hide();
    currentPlaylistId = pl.id;
    renderSidebar();
    renderMain();
  }, 400);
});

filterInput.addEventListener("input", renderMain);
sortSelect.addEventListener("change", renderMain);
btnClearFilter.addEventListener("click", () => {
  filterInput.value = "";
  renderMain();
});

// INIT
(async function init() {
  playlists = await apiGetPlaylists();
  currentPlaylistId = playlists.length ? playlists[0].id : null;
  renderSidebar();
  renderMain();

  // refresh when coming back from search page
  window.addEventListener("focus", async () => {
    playlists = await apiGetPlaylists();
    if (!playlists.find(p => p.id === currentPlaylistId)) {
      currentPlaylistId = playlists.length ? playlists[0].id : null;
    }
    renderSidebar();
    renderMain();
  });
})();

// HELPERS
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/`/g, "&#96;");
}
