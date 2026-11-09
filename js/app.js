// NoteBazaar — Home page: notes listing, search & sort
import { db } from "./firebase-init.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { mountHeader, esc, fmtDate, priceBadge, toast, configBanner, CONFIGURED } from "./ui.js";

mountHeader("home");

const grid = document.getElementById("notes-grid");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");

let NOTES = [];

searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);

if (!CONFIGURED) {
  grid.innerHTML = "";
  emptyState.innerHTML = configBanner();
} else {
  loadNotes();
}

async function loadNotes() {
  grid.innerHTML = `<div class="skeleton" style="grid-column:1/-1">Loading notes…</div>`;
  try {
    const snap = await getDocs(query(collection(db, "notes"), orderBy("createdAt", "desc")));
    NOTES = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  } catch (err) {
    console.error(err);
    grid.innerHTML = "";
    emptyState.innerHTML = `
      <div class="empty-state">
        <div class="empty-ico">📡</div>
        <h3>Could not load notes</h3>
        <p>Check that Firestore is created and the rules from <b>firestore.rules</b> are published.<br><small>${esc(err.message)}</small></p>
      </div>`;
  }
}

function render() {
  const q = searchInput.value.trim().toLowerCase();
  let list = NOTES;

  if (q) {
    list = list.filter(n =>
      (n.title || "").toLowerCase().includes(q) ||
      (n.description || "").toLowerCase().includes(q)
    );
  }

  const sort = sortSelect.value;
  if (sort === "free") list = [...list].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  else if (sort === "low") list = [...list].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  else if (sort === "high") list = [...list].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));

  if (!NOTES.length) {
    grid.innerHTML = "";
    emptyState.innerHTML = `
      <div class="empty-state">
        <div class="empty-ico">📭</div>
        <h3>No notes published yet</h3>
        <p>Admin can upload the first note from the <b>Admin</b> page.<br>Free notes (₹0) and paid notes both show up here.</p>
      </div>`;
    return;
  }

  if (!list.length) {
    grid.innerHTML = "";
    emptyState.innerHTML = `
      <div class="empty-state">
        <div class="empty-ico">🔍</div>
        <h3>No notes match your search</h3>
        <p>Try a different keyword, or clear the search box.</p>
      </div>`;
    return;
  }

  emptyState.innerHTML = "";
  grid.innerHTML = list.map(cardHTML).join("");
}

function cardHTML(n) {
  const price = Number(n.price) || 0;
  return `
    <a class="note-card" href="note.html?id=${n.id}">
      <div class="card-top">
        ${priceBadge(price)}
        <span class="chip">${price <= 0 ? "🆓 Instant access" : "💳 UPI"}</span>
      </div>
      <h3>${esc(n.title)}</h3>
      <p class="desc">${esc(n.description || "No description provided.")}</p>
      <div class="card-foot">
        <span class="muted" style="color:var(--muted-2);font-size:12.5px">📅 ${fmtDate(n.createdAt)}</span>
        <span class="view-link">View details →</span>
      </div>
    </a>`;
}
