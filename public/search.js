import { requireLogin, logout } from "./auth.js";

// =====================
// CONFIG
// =====================
const YT_API_KEY = "AIzaSyDwcCkkjccyadOO1jAaWxJKG8-rHofVbaM";

// =====================
// AUTH + HEADER
// =====================
const user = requireLogin();
if (!user) throw new Error("Not logged in");

const userImg = document.getElementById("userImg");
const welcomeText = document.getElementById("welcomeText");
const welcomeSub = document.getElementById("welcomeSub");
const btnLogout = document.getElementById("btnLogout");

userImg.src = user.imageUrl || "";
userImg.onerror = () => { userImg.src = "https://via.placeholder.com/40?text=U"; };
welcomeText.textContent = `Hello ${user.firstName || user.username}`;
welcomeSub.textContent = `@${user.username}`;
btnLogout.addEventListener("click", logout);

// =====================
// UI
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

// =====================
// PLAYER MODAL
// =====================
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

// =====================
// PLAYLIST API
// =====================
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

// =====================
// ADD-TO-PLAYLIST MODAL
// =====================
const favModalEl = document.getElementById("favModal");
const favModal = new bootstrap.Modal(favModalEl);
const favInfo = document.getElementById("favInfo");
const playlistSelect = document.getElementById("playlistSelect");
const newPlaylistName = document.getElementById("newPlaylistName");
const favMsg = document.getElementById("favMsg");
const btnAddFav = document.getElementById("btnAddFav");

let pendingVideo = null;

function showFavMsg(text, type = "danger") {
  favMsg.className = `alert alert-${type} mt-3`;
  favMsg.textContent = text;
  favMsg.classList.remove("d-none");
}
function hideFavMsg() {
  favMsg.classList.add("d-none");
}

async function openFavModal(videoObj) {
  pendingVideo = videoObj;
  hideFavMsg();
  newPlaylistName.value = "";
  favInfo.textContent = videoObj.title;

  const playlists = await apiGetPlaylists();

  playlistSelect.innerHTML = "";
  if (!playlists.length) {
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

btnAddFav.addEventListener("click", async () => {
  try {
    hideFavMsg();
    if (!pendingVideo) return;

    const playlists = await apiGetPlaylists();
    const chosenId = playlistSelect.value;
    const newName = newPlaylistName.value.trim();

    let target = null;

    // Create playlist
    if (newName) {
      target = {
        id: crypto?.randomUUID ? crypto.randomUUID() : `pl_${Date.now()}`,
        name: newName,
        items: []
      };
      playlists.push(target);
    } else {
      target = playlists.find(p => p.id === chosenId) || null;
    }

    if (!target) {
      showFavMsg("Choose a playlist OR type a new playlist name.");
      return;
    }

    // prevent duplicate
    if ((target.items || []).some(it => it.videoId === pendingVideo.videoId)) {
      showFavMsg("This video is already in that playlist.", "warning");
      return;
    }

    target.items = target.items || [];
    target.items.push({ ...pendingVideo, rating: 0 });

    await apiSavePlaylists(playlists);

    showFavMsg("Added ✅", "success");
    setTimeout(() => favModal.hide(), 600);
  } catch (err) {
    console.error(err);
    showFavMsg(err.message || "Failed to add.");
  }
});

// =====================
// YOUTUBE SEARCH
// =====================
async function ytSearch(query) {
  const url =
    "https://www.googleapis.com/youtube/v3/search" +
    `?part=snippet&type=video&maxResults=12&q=${encodeURIComponent(query)}&key=${YT_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "YouTube search failed");
  return data.items || [];
}

function renderResults(items) {
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

    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";

    col.innerHTML = `
      <div class="card h-100 shadow-sm hover-card">
        <img class="thumb" src="${thumb}" alt="thumb">
        <div class="card-body d-flex flex-column">
          <h6 class="card-title line-clamp-2">${escapeHtml(title)}</h6>

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
    col.querySelector(".btnPlay").addEventListener("click", () => openPlayer(videoId, title));
    col.querySelector(".btnFav").addEventListener("click", () => {
      openFavModal({ videoId, title, thumb });
    });

    resultsEl.appendChild(col);
  }
}

async function runSearch() {
  const q = qInput.value.trim();
  if (!q) return;

  try {
    showMsg("Searching...", "info");
    const items = await ytSearch(q);
    renderResults(items);
  } catch (err) {
    console.error(err);
    showMsg(err.message || "Search failed");
  }
}

btnSearch.addEventListener("click", runSearch);
qInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    runSearch();
  }
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
