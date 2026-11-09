// NoteBazaar — Note detail page: access control, UPI purchase, view & download
import { db, auth } from "./firebase-init.js";
import {
  doc, getDoc, collection, query, where, getDocs, addDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  mountHeader, esc, fmtDate, priceBadge, toast, copyText, openAuthModal, configBanner, CONFIGURED
} from "./ui.js";

mountHeader("note");

const noteId = new URLSearchParams(location.search).get("id");

/* elements */
const viewerBody = document.getElementById("viewer-body");
const viewerTitle = document.getElementById("viewer-title");
const viewerStatus = document.getElementById("viewer-status");
const npTitle = document.getElementById("np-title");
const npDesc = document.getElementById("np-desc");
const npMeta = document.getElementById("np-meta");
const npPrice = document.getElementById("np-price");
const actionArea = document.getElementById("action-area");
const trustNote = document.getElementById("trust-note");

/* buy modal elements */
const buyModal = document.getElementById("buy-modal");
const buyNoteLabel = document.getElementById("buy-note-label");
const payAmountEl = document.getElementById("pay-amount");
const upiIdText = document.getElementById("upi-id-text");
const upiQr = document.getElementById("upi-qr");
const openUpiBtn = document.getElementById("open-upi");
const utrInput = document.getElementById("utr-input");
const utrErr = document.getElementById("utr-err");
const submitOrderBtn = document.getElementById("submit-order");

let note = null;
let state = "loading"; // guest | free | locked | pending | rejected | unlocked | notfound
let lastOrder = null;

if (!CONFIGURED) {
  viewerBody.innerHTML = configBanner();
  npTitle.textContent = "Firebase not configured";
  actionArea.innerHTML = "";
} else if (!noteId) {
  renderNotFound();
} else {
  onAuthStateChanged(auth, () => init());
}

async function init() {
  try {
    if (!note) {
      const snap = await getDoc(doc(db, "notes", noteId));
      if (!snap.exists()) return renderNotFound();
      note = { id: snap.id, ...snap.data() };
      viewerTitle.textContent = note.title || "Note";
      npTitle.textContent = note.title || "Untitled note";
      npDesc.textContent = note.description || "No description provided.";
      npMeta.innerHTML = `
        <span class="chip">📄 ${esc(note.fileName || "PDF")}</span>
        <span class="chip">📅 ${fmtDate(note.createdAt)}</span>`;
      npPrice.innerHTML = priceBadge(note.price);
    }
    await computeState();
    renderAll();
  } catch (err) {
    console.error(err);
    viewerBody.innerHTML = `<div class="empty-state" style="margin:20px"><div class="empty-ico">⚠️</div>
      <h3>Could not load this note</h3><p>${esc(err.message)}</p></div>`;
  }
}

function renderNotFound() {
  state = "notfound";
  viewerBody.innerHTML = `
    <div class="empty-state" style="margin:20px;align-self:center;width:100%">
      <div class="empty-ico">🕵️</div>
      <h3>Note not found</h3>
      <p>This note may have been removed.<br><a href="index.html" style="color:var(--accent)">← Browse all notes</a></p>
    </div>`;
  npTitle.textContent = "Note not found";
  actionArea.innerHTML = "";
  npPrice.innerHTML = "";
}

/* ---------- access state machine ---------- */
async function computeState() {
  const u = auth.currentUser;
  if (!u) { state = "guest"; return; }

  // 1) already in user's library (purchased or free-claimed)?
  const libDoc = await getDoc(doc(db, `users/${u.uid}/library`, noteId));
  if (libDoc.exists()) { state = "unlocked"; return; }

  // 2) free note?
  if ((Number(note.price) || 0) <= 0) { state = "free"; return; }

  // 3) check this user's orders for this note
  try {
    const ordersSnap = await getDocs(query(collection(db, "purchases"), where("userId", "==", u.uid)));
    const mine = ordersSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(o => o.noteId === noteId)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    lastOrder = mine[0] || null;
    const st = lastOrder?.status;
    state = st === "pending" ? "pending" : st === "rejected" ? "rejected" : "locked";
  } catch (err) {
    console.error(err);
    state = "locked";
  }
}

function renderAll() {
  renderViewer();
  renderActions();
}

function renderViewer() {
  if (state === "unlocked") {
    viewerStatus.innerHTML = `<span class="chip chip-approved">✅ Unlocked</span>`;
    viewerBody.innerHTML = `<iframe class="pdf-frame" id="pdf-frame" src="${esc(note.fileUrl)}" title="PDF reader"></iframe>`;
  } else if (state === "loading") {
    viewerBody.innerHTML = `<div class="skeleton" style="margin:auto">Loading…</div>`;
  } else {
    const map = {
      guest: ["🔐", "Login to access this note", "Create a free account or log in to buy / unlock this note."],
      free: ["🎁", "Free note — one click to unlock", "This note costs ₹0. Claim it and start reading instantly."],
      locked: ["🔒", "This note is locked", `Unlock this PDF for ₹${Number(note.price) || 0} via UPI — pay once, keep forever.`],
      pending: ["⏳", "Payment under review", "We received your UTR. Admin is verifying your payment — the note unlocks automatically after approval."],
      rejected: ["❌", "Payment could not be verified", "Your last submission was rejected. Please double-check the UTR and submit again, or contact the admin."]
    };
    const [ico, h, p] = map[state] || map.locked;
    viewerStatus.innerHTML = `<span class="chip">🔒 Locked</span>`;
    viewerBody.innerHTML = `
      <div class="locked-view">
        <div class="lock-ico">${ico}</div>
        <h3>${h}</h3>
        <p>${p}</p>
        <div class="doc-sim"><i></i><i></i><i></i><i></i><i></i></div>
      </div>`;
  }
}

function renderActions() {
  const price = Number(note?.price) || 0;
  const u = auth.currentUser;
  trustNote.hidden = price <= 0; // trust box mainly for paid flow

  if (state === "unlocked") {
    actionArea.innerHTML = `
      <button class="btn btn-primary" id="act-download">⬇️ Download PDF</button>
      <a class="btn btn-outline" id="act-newtab" href="${esc(note.fileUrl)}" target="_blank" rel="noopener">↗ Open in new tab</a>
      <button class="btn btn-ghost" id="act-tocopy">🔗 Copy file link</button>`;
    document.getElementById("act-download").onclick = downloadPdf;
    document.getElementById("act-tocopy").onclick = async () => {
      await copyText(note.fileUrl);
      toast("File link copied!");
    };
    return;
  }

  if (state === "guest") {
    actionArea.innerHTML = `
      <button class="btn btn-primary btn-lg" id="act-login">🔐 Login / Register</button>
      <p class="hint">Login is required so your purchases stay attached to your account.</p>`;
    document.getElementById("act-login").onclick = () => openAuthModal("login");
    return;
  }

  if (state === "free") {
    actionArea.innerHTML = `
      <div class="side-price" style="margin-bottom:2px"><span class="amt free">FREE</span><span class="lbl">No payment needed 🎉</span></div>
      <button class="btn btn-green btn-lg" id="act-free">🎁 Get Free Access</button>
      <p class="hint">Adds this note to your library instantly.</p>`;
    document.getElementById("act-free").onclick = claimFree;
    return;
  }

  if (state === "locked" || state === "rejected") {
    actionArea.innerHTML = `
      ${state === "rejected" ? `
        <div class="status-panel rejected">
          <b>❌ Payment rejected</b><br>
          ${lastOrder?.reviewedAt ? `Reviewed on ${fmtDate(lastOrder.reviewedAt)}.` : ""}
          Please re-check your UTR and submit a fresh request.
        </div>` : ""}
      <button class="btn btn-primary btn-lg" id="act-buy">💳 Buy Now — ₹${price}</button>
      <p class="hint">Pay via GPay / PhonePe / Paytm · One-time payment · Lifetime access</p>`;
    document.getElementById("act-buy").onclick = openBuyModal;
    return;
  }

  if (state === "pending") {
    actionArea.innerHTML = `
      <div class="status-panel pending">
        <b>⏳ Verification in progress</b><br>
        Your payment of <b>₹${Number(lastOrder?.amount ?? price)}</b> was submitted
        ${lastOrder?.createdAt ? `on ${fmtDate(lastOrder.createdAt)}` : ""} and is awaiting admin approval.
        <div class="utr-line">UTR submitted: <span class="mono">${esc(lastOrder?.utr || "—")}</span></div>
      </div>
      <button class="btn btn-outline" id="act-refresh">🔄 Refresh status</button>
      <p class="hint">The note unlocks automatically right after the admin approves it.</p>`;
    document.getElementById("act-refresh").onclick = async (e) => {
      e.target.disabled = true; e.target.textContent = "Checking…";
      await computeState(); renderAll();
      if (state === "pending") toast("Still under review — check again in a bit.", "info");
    };
  }
}

/* ---------- free claim ---------- */
async function claimFree() {
  const btn = document.getElementById("act-free");
  btn.disabled = true; btn.textContent = "Unlocking…";
  try {
    await setDoc(doc(db, `users/${auth.currentUser.uid}/library`, noteId), {
      noteId,
      title: note.title || "",
      free: true,
      claimedAt: serverTimestamp()
    });
    toast("Unlocked! Added to your library 🎉");
    state = "unlocked"; renderAll();
  } catch (err) {
    console.error(err);
    toast("Could not unlock: " + err.message, "err");
    btn.disabled = false; btn.textContent = "🎁 Get Free Access";
  }
}

/* ---------- purchase flow ---------- */
function buildUpiLink(amount) {
  const params = new URLSearchParams({
    pa: window.UPI_ID,
    pn: window.UPI_NAME,
    am: Number(amount).toFixed(2),
    cu: "INR",
    tn: `NoteBazaar - ${String(note.title || "Notes").slice(0, 30)}`
  });
  return `upi://pay?${params.toString()}`;
}

function openBuyModal() {
  const price = Number(note.price) || 0;
  const link = buildUpiLink(price);

  buyNoteLabel.textContent = note.title || "";
  payAmountEl.textContent = `₹${price}`;
  upiIdText.textContent = window.UPI_ID;
  upiQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(link)}`;
  openUpiBtn.href = link;
  utrInput.value = "";
  utrErr.textContent = "";
  buyModal.hidden = false;
}

document.getElementById("buy-x").onclick = () => { buyModal.hidden = true; };
buyModal.addEventListener("click", e => { if (e.target === buyModal) buyModal.hidden = true; });

document.getElementById("copy-upi").onclick = async () => {
  await copyText(window.UPI_ID);
  toast(`UPI ID copied: ${window.UPI_ID}`);
};

submitOrderBtn.onclick = async () => {
  const utr = utrInput.value.trim().replace(/\s+/g, "");
  utrErr.textContent = "";

  if (!/^[a-zA-Z0-9]{6,22}$/.test(utr)) {
    utrErr.textContent = "Please enter the correct UTR / Transaction ID from your UPI app (6–22 letters/digits).";
    return;
  }

  submitOrderBtn.disabled = true;
  submitOrderBtn.textContent = "Submitting…";
  try {
    await addDoc(collection(db, "purchases"), {
      noteId,
      noteTitle: note.title || "",
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      amount: Number(note.price) || 0,
      upiId: window.UPI_ID,
      utr,
      status: "pending",
      createdAt: serverTimestamp()
    });
    buyModal.hidden = true;
    toast("Payment submitted! Admin will verify it shortly. ✅");
    await computeState();
    renderAll();
  } catch (err) {
    console.error(err);
    utrErr.textContent = "Could not submit: " + err.message;
  } finally {
    submitOrderBtn.disabled = false;
    submitOrderBtn.textContent = "✅ I've paid — submit for approval";
  }
};

/* ---------- download ---------- */
function downloadPdf() {
  const a = document.createElement("a");
  a.href = note.fileUrl;
  a.download = note.fileName || "note.pdf";
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast("Download started ⬇️");
}
