// NoteBazaar — My Library page
import { db, auth } from "./firebase-init.js";
import {
  collection, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { mountHeader, esc, fmtDate, priceBadge, openAuthModal, configBanner, CONFIGURED } from "./ui.js";

mountHeader("library");

const grid = document.getElementById("library-grid");
const emptyState = document.getElementById("empty-state");

if (!CONFIGURED) {
  emptyState.innerHTML = configBanner();
} else {
  onAuthStateChanged(auth, render);
}

async function render() {
  const u = auth.currentUser;

  if (!u) {
    grid.innerHTML = "";
    emptyState.innerHTML = `
      <div class="empty-state">
        <div class="empty-ico">🔐</div>
        <h3>Login to see your library</h3>
        <p>Your purchased &amp; free notes appear here after you log in.</p>
        <p style="margin-top:16px"><button class="btn btn-primary" id="lib-login">🔐 Login / Register</button></p>
      </div>`;
    document.getElementById("lib-login").onclick = () => openAuthModal("login");
    return;
  }

  grid.innerHTML = `<div class="skeleton" style="grid-column:1/-1">Loading your library…</div>`;
  emptyState.innerHTML = "";

  try {
    const libSnap = await getDocs(collection(db, `users/${u.uid}/library`));
    const ids = libSnap.docs.map(d => d.id);

    if (!ids.length) {
      grid.innerHTML = "";
      emptyState.innerHTML = `
        <div class="empty-state">
          <div class="empty-ico">📖</div>
          <h3>Your library is empty</h3>
          <p>Browse the store and unlock your first note — free notes need zero payment!</p>
          <p style="margin-top:16px"><a class="btn btn-primary" href="index.html">Browse notes →</a></p>
        </div>`;
      return;
    }

    const notes = await Promise.all(ids.map(async id => {
      const s = await getDoc(doc(db, "notes", id));
      return s.exists() ? { id: s.id, ...s.data() } : null;
    }));

    const valid = notes.filter(Boolean);
    if (!valid.length) {
      grid.innerHTML = "";
      emptyState.innerHTML = `<div class="empty-state"><div class="empty-ico">🧹</div>
        <h3>These notes are no longer available</h3><p>The admin may have removed them.</p></div>`;
      return;
    }

    emptyState.innerHTML = "";
    grid.innerHTML = valid.map(cardHTML).join("");
  } catch (err) {
    console.error(err);
    grid.innerHTML = "";
    emptyState.innerHTML = `
      <div class="empty-state">
        <div class="empty-ico">⚠️</div>
        <h3>Could not load your library</h3>
        <p>${esc(err.message)}</p>
      </div>`;
  }
}

function cardHTML(n) {
  return `
    <a class="note-card" href="note.html?id=${n.id}">
      <div class="card-top">
        ${priceBadge(n.price)}
        <span class="chip chip-approved">✅ Owned</span>
      </div>
      <h3>${esc(n.title)}</h3>
      <p class="desc">${esc(n.description || "No description provided.")}</p>
      <div class="card-foot">
        <span style="color:var(--muted-2);font-size:12.5px">📅 ${fmtDate(n.createdAt)}</span>
        <span class="view-link">Read / Download →</span>
      </div>
    </a>`;
}
