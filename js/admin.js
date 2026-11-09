// NoteBazaar — Admin panel: upload notes, manage, verify payments
import { db, auth, storage, isAdmin } from "./firebase-init.js";
import {
  collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc,
  doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  mountHeader, esc, fmtDate, priceBadge, toast, copyText, openAuthModal, configBanner, CONFIGURED
} from "./ui.js";

mountHeader("admin");

const guardBox = document.getElementById("admin-guard");
const panel = document.getElementById("admin-panel");

/* ---------- tab switching ---------- */
document.querySelectorAll(".admin-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    ["upload", "notes", "orders"].forEach(t => {
      document.getElementById(`tab-${t}`).hidden = t !== btn.dataset.tab;
    });
  });
});

/* ---------- guard ---------- */
if (!CONFIGURED) {
  guardBox.innerHTML = configBanner();
} else {
  onAuthStateChanged(auth, renderGuard);
}

function renderGuard() {
  const u = auth.currentUser;
  if (!u) {
    panel.hidden = true;
    guardBox.innerHTML = `
      <div class="empty-state">
        <div class="empty-ico">🔐</div>
        <h3>Admin login required</h3>
        <p>Log in with the email listed in <b>ADMIN_EMAILS</b> (js/firebase-config.js).</p>
        <p style="margin-top:16px"><button class="btn btn-primary" id="gd-login">🔐 Login</button></p>
      </div>`;
    document.getElementById("gd-login").onclick = () => openAuthModal("login");
    return;
  }
  if (!isAdmin()) {
    panel.hidden = true;
    guardBox.innerHTML = `
      <div class="empty-state">
        <div class="empty-ico">⛔</div>
        <h3>This account is not an admin</h3>
        <p>You are logged in as <b>${esc(u.email)}</b>.<br>
        Add this exact email to <b>ADMIN_EMAILS</b> in <b>js/firebase-config.js</b> — and also replace
        <b>REPLACE_WITH_ADMIN_EMAIL</b> in <b>firestore.rules</b> &amp; <b>storage.rules</b>, then republish the rules.</p>
      </div>`;
    return;
  }
  guardBox.innerHTML = "";
  panel.hidden = false;
  loadAdminNotes();
  loadOrders();
}

/* ================= UPLOAD ================= */
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("up-file");
const fileChip = document.getElementById("file-chip");
const fileNameEl = document.getElementById("file-name");
const progressWrap = document.getElementById("progress-wrap");
const progressBar = document.getElementById("progress-bar");
const progressLabel = document.getElementById("progress-label");
const submitBtn = document.getElementById("up-submit");

let pickedFile = null;

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag");
  if (e.dataTransfer.files.length) pickFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", () => { if (fileInput.files.length) pickFile(fileInput.files[0]); });
document.getElementById("file-clear").onclick = clearFile;

function pickFile(f) {
  if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
    toast("Only PDF files are allowed.", "err");
    return;
  }
  pickedFile = f;
  fileNameEl.textContent = `${f.name} · ${(f.size / 1024 / 1024).toFixed(2)} MB`;
  fileChip.hidden = false;
  dropZone.style.display = "none";
}

function clearFile() {
  pickedFile = null;
  fileInput.value = "";
  fileChip.hidden = true;
  dropZone.style.display = "flex";
}

document.getElementById("upload-form").addEventListener("submit", e => {
  e.preventDefault();
  const title = document.getElementById("up-title").value.trim();
  const description = document.getElementById("up-desc").value.trim();
  const price = Math.max(0, Math.floor(Number(document.getElementById("up-price").value) || 0));

  if (!title) return toast("Please enter a note title.", "err");
  if (!pickedFile) return toast("Please attach a PDF file.", "err");

  uploadNote(title, description, price, pickedFile);
});

function uploadNote(title, description, price, file) {
  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading… 0%";
  progressWrap.classList.add("on");

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const filePath = `notes/${Date.now()}_${safeName}`;
  const task = uploadBytesResumable(ref(storage, filePath), file, { contentType: "application/pdf" });

  task.on("state_changed",
    snap => {
      const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      progressBar.style.width = pct + "%";
      progressLabel.textContent = `Uploading… ${pct}%`;
      submitBtn.textContent = `Uploading… ${pct}%`;
    },
    err => {
      console.error(err);
      toast("Upload failed: " + err.message, "err");
      resetUploadUi();
    },
    async () => {
      try {
        const fileUrl = await getDownloadURL(task.snapshot.ref);
        await addDoc(collection(db, "notes"), {
          title, description, price,
          fileName: file.name,
          filePath,
          fileUrl,
          createdAt: serverTimestamp()
        });
        toast(price === 0 ? "Free note published! 🎉" : `Note published at ₹${price}! 🎉`);
        document.getElementById("upload-form").reset();
        clearFile();
        loadAdminNotes();
      } catch (err) {
        console.error(err);
        toast("Could not save note: " + err.message, "err");
      } finally {
        resetUploadUi();
      }
    }
  );
}

function resetUploadUi() {
  submitBtn.disabled = false;
  submitBtn.textContent = "🚀 Publish Note";
  progressWrap.classList.remove("on");
  progressBar.style.width = "0%";
}

/* ================= MY NOTES ================= */
let ADMIN_NOTES = [];

async function loadAdminNotes() {
  const listEl = document.getElementById("admin-notes-list");
  try {
    const snap = await getDocs(query(collection(db, "notes"), orderBy("createdAt", "desc")));
    ADMIN_NOTES = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById("notes-count").textContent = ADMIN_NOTES.length ? `(${ADMIN_NOTES.length})` : "";
    if (!ADMIN_NOTES.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-ico">📭</div>
        <h3>No notes yet</h3><p>Upload your first note from the Upload tab.</p></div>`;
      return;
    }
    listEl.innerHTML = ADMIN_NOTES.map(n => `
      <div class="list-row">
        <div class="lr-main">
          <div class="lr-title">${esc(n.title)}</div>
          <div class="lr-sub">📕 ${esc(n.fileName || "PDF")} · 📅 ${fmtDate(n.createdAt)}</div>
        </div>
        ${priceBadge(n.price)}
        <div class="lr-actions">
          <button class="btn btn-ghost btn-sm" data-act="price" data-id="${n.id}" data-price="${Number(n.price) || 0}">✏️ Price</button>
          <button class="btn btn-ghost btn-sm" data-act="link" data-id="${n.id}">🔗 Link</button>
          <button class="btn btn-danger btn-sm" data-act="del" data-id="${n.id}">🗑️ Delete</button>
        </div>
      </div>`).join("");

    listEl.querySelectorAll("button").forEach(b => b.addEventListener("click", onNoteAction));
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<div class="empty-state"><div class="empty-ico">⚠️</div>
      <h3>Could not load notes</h3><p>${esc(err.message)}</p></div>`;
  }
}

async function onNoteAction(e) {
  const act = e.currentTarget.dataset.act;
  const id = e.currentTarget.dataset.id;
  const note = ADMIN_NOTES.find(n => n.id === id);
  if (!note) return;

  if (act === "link") {
    await copyText(note.fileUrl || "");
    toast("PDF link copied!");
  }

  if (act === "price") {
    const cur = Number(e.currentTarget.dataset.price) || 0;
    const val = prompt(`New price for "${note.title}" (₹).\nEnter 0 to make this note FREE:`, cur);
    if (val === null) return;
    const p = Math.max(0, Math.floor(Number(val) || 0));
    if (p === cur) return;
    try {
      await updateDoc(doc(db, "notes", id), { price: p });
      toast(p === 0 ? "Note is now FREE 🎉" : `Price updated to ₹${p}`);
      loadAdminNotes();
    } catch (err) { toast("Update failed: " + err.message, "err"); }
  }

  if (act === "del") {
    if (!confirm(`Delete "${note.title}"?\n\nBuyers who already unlocked it will lose access. This cannot be undone.`)) return;
    try {
      if (note.filePath) {
        try { await deleteObject(ref(storage, note.filePath)); } catch (err) { /* file may be gone */ }
      }
      await deleteDoc(doc(db, "notes", id));
      toast("Note deleted.");
      loadAdminNotes();
      loadOrders();
    } catch (err) { toast("Delete failed: " + err.message, "err"); }
  }
}

/* ================= ORDERS ================= */
async function loadOrders() {
  const pendingEl = document.getElementById("pending-orders");
  const allEl = document.getElementById("all-orders");
  try {
    const snap = await getDocs(collection(db, "purchases"));
    const all = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const pending = all.filter(o => o.status === "pending");

    document.getElementById("pending-count").textContent = pending.length ? `(${pending.length})` : "";
    document.getElementById("pending-chip").textContent = pending.length;

    if (!pending.length) {
      pendingEl.innerHTML = `<div class="empty-state" style="padding:34px 20px"><div class="empty-ico">✔️</div>
        <h3 style="font-size:16px">No pending payments</h3>
        <p>New buyer requests will appear here with their UTR number.</p></div>`;
    } else {
      pendingEl.innerHTML = pending.map(o => orderCard(o, true)).join("");
      pendingEl.querySelectorAll("button").forEach(b => b.addEventListener("click", onOrderAction));
    }

    if (!all.length) {
      allEl.innerHTML = `<p class="hint">No orders yet.</p>`;
    } else {
      allEl.innerHTML = all.slice(0, 40).map(o => orderCard(o, false)).join("");
      allEl.querySelectorAll("button").forEach(b => b.addEventListener("click", onOrderAction));
    }
  } catch (err) {
    console.error(err);
    pendingEl.innerHTML = `<div class="empty-state" style="padding:30px"><div class="empty-ico">⚠️</div>
      <h3>Could not load orders</h3><p>${esc(err.message)}</p></div>`;
    allEl.innerHTML = "";
  }
}

function orderCard(o, actionable) {
  const statusChip =
    o.status === "approved" ? `<span class="chip chip-approved">✅ Approved</span>` :
    o.status === "rejected" ? `<span class="chip chip-rejected">❌ Rejected</span>` :
    `<span class="chip chip-pending">⏳ Pending</span>`;
  return `
    <div class="order-card">
      <div class="order-top">
        <div>
          <div class="order-note">${esc(o.noteTitle || "Note")}</div>
          <div class="order-meta">
            <span>👤 ${esc(o.userEmail || "—")}</span>
            <span>💰 <b>₹${Number(o.amount) || 0}</b></span>
            <span>📅 ${fmtDate(o.createdAt)}</span>
          </div>
        </div>
        ${statusChip}
      </div>
      <div class="order-utr">
        <span style="color:var(--muted)">UTR:</span>
        <span class="mono" style="font-weight:600">${esc(o.utr || "—")}</span>
        <button class="btn btn-ghost btn-sm" data-act="copyutr" data-id="${o.id}" data-utr="${esc(o.utr || "")}">Copy</button>
        <span class="hint" style="margin-left:4px">Match this in your UPI app before approving</span>
      </div>
      ${actionable ? `
      <div class="order-actions">
        <button class="btn btn-green btn-sm" data-act="approve" data-id="${o.id}">✅ Approve &amp; unlock</button>
        <button class="btn btn-danger btn-sm" data-act="reject" data-id="${o.id}">❌ Reject</button>
      </div>` : ""}
    </div>`;
}

async function onOrderAction(e) {
  const act = e.currentTarget.dataset.act;
  const id = e.currentTarget.dataset.id;
  const ordersSnap = await getDocs(collection(db, "purchases"));
  const order = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })).find(o => o.id === id);
  if (!order) return;

  if (act === "copyutr") {
    await copyText(e.currentTarget.dataset.utr || "");
    toast("UTR copied — now match it in your UPI app.");
    return;
  }

  if (act === "approve") {
    if (!confirm(`Approve ₹${Number(order.amount) || 0} payment by ${order.userEmail}?\n\nMake sure the UTR ${order.utr} matches a real UPI credit in your app.`)) return;
    try {
      await updateDoc(doc(db, "purchases", id), { status: "approved", reviewedAt: serverTimestamp() });
      await setDoc(doc(db, `users/${order.userId}/library`, order.noteId), {
        noteId: order.noteId,
        title: order.noteTitle || "",
        amount: Number(order.amount) || 0,
        purchasedAt: serverTimestamp()
      });
      toast("Payment approved — note unlocked for the buyer ✅");
      loadOrders();
    } catch (err) { toast("Approve failed: " + err.message, "err"); }
  }

  if (act === "reject") {
    if (!confirm(`Reject this payment request?\nThe buyer will be asked to submit a new UTR.`)) return;
    try {
      await updateDoc(doc(db, "purchases", id), { status: "rejected", reviewedAt: serverTimestamp() });
      toast("Request rejected.");
      loadOrders();
    } catch (err) { toast("Reject failed: " + err.message, "err"); }
  }
}
