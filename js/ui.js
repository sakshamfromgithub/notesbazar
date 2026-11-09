// NoteBazaar — shared UI helpers (header, toasts, auth modal, formatting)
import { auth, CONFIGURED } from "./firebase-init.js";
import {
  onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ---------- small utils ---------- */
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

export function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function priceBadge(p) {
  p = Number(p) || 0;
  return p <= 0
    ? '<span class="badge badge-free">FREE</span>'
    : `<span class="badge badge-paid">₹${p}</span>`;
}

export function toast(msg, type = "ok") {
  let wrap = document.getElementById("toast-wrap");
  if (!wrap) { wrap = document.createElement("div"); wrap.id = "toast-wrap"; document.body.appendChild(wrap); }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.classList.add("show"), 20);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3800);
}

export function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); } catch (e) { /* ignore */ }
  ta.remove();
  return Promise.resolve();
}

/* ---------- header ---------- */
export function mountHeader(active = "home") {
  const el = document.getElementById("site-header");
  if (!el) return;
  el.innerHTML = `
    <header class="topbar">
      <div class="container topbar-inner">
        <a class="brand" href="index.html"><span class="brand-ico">📚</span>Note<span>Bazaar</span></a>
        <nav class="nav">
          <a href="index.html" class="${active === "home" ? "active" : ""}">Home</a>
          <a href="library.html" class="${active === "library" ? "active" : ""}">My Library</a>
          <a href="admin.html" class="${active === "admin" ? "active" : ""}">Admin</a>
        </nav>
        <div class="auth-area" id="auth-area"></div>
      </div>
    </header>`;
  renderAuthArea();
  onAuthStateChanged(auth, renderAuthArea);
}

function renderAuthArea() {
  const box = document.getElementById("auth-area");
  if (!box) return;
  const u = auth.currentUser;
  if (u) {
    box.innerHTML = `
      <span class="user-chip" title="${esc(u.email)}">${esc(u.email)}</span>
      <button class="btn btn-ghost btn-sm" id="hdr-logout">Logout</button>`;
    box.querySelector("#hdr-logout").onclick = async () => {
      await signOut(auth);
      toast("Logged out. See you soon!");
      setTimeout(() => location.reload(), 400);
    };
  } else {
    box.innerHTML = `<button class="btn btn-primary btn-sm" id="hdr-login">Login</button>`;
    box.querySelector("#hdr-login").onclick = () => openAuthModal("login");
  }
}

/* ---------- auth modal (login / register) ---------- */
const AUTH_ERRORS = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "No account found with this email. Please register first.",
  "auth/wrong-password": "Incorrect password.",
  "auth/email-already-in-use": "This email is already registered. Try logging in.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/network-request-failed": "Network error. Please check your internet connection.",
  "auth/unauthorized-domain": "This domain is not authorized. In Firebase Console → Authentication → Settings → Authorized domains, add this website's domain.",
  "auth/too-many-requests": "Too many attempts. Please try again in a few minutes.",
  "auth/operation-not-allowed": "Email/Password sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method."
};
export function mapAuthError(e) {
  return AUTH_ERRORS[e?.code] || e?.message || "Something went wrong. Please try again.";
}

export function openAuthModal(mode = "login") {
  if (document.getElementById("auth-modal")) { setAuthMode(mode); return; }

  const wrap = document.createElement("div");
  wrap.id = "auth-modal";
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `
    <div class="modal">
      <button class="modal-x" id="auth-x" aria-label="Close">✕</button>
      <div class="modal-brand"><span>📚</span> NoteBazaar</div>
      <div class="auth-tabs">
        <button id="tab-login" class="auth-tab active">Login</button>
        <button id="tab-register" class="auth-tab">Create Account</button>
      </div>

      <form id="form-login" class="auth-form">
        <label class="field"><span>Email</span>
          <input type="email" id="li-email" placeholder="you@example.com" required autocomplete="email"></label>
        <label class="field"><span>Password</span>
          <input type="password" id="li-pass" placeholder="••••••••" required autocomplete="current-password"></label>
        <button class="btn btn-primary btn-block" type="submit">Login</button>
        <p class="form-err" id="li-err"></p>
      </form>

      <form id="form-register" class="auth-form" hidden>
        <label class="field"><span>Email</span>
          <input type="email" id="re-email" placeholder="you@example.com" required autocomplete="email"></label>
        <label class="field"><span>Password (min 6 characters)</span>
          <input type="password" id="re-pass" placeholder="Create a password" required minlength="6" autocomplete="new-password"></label>
        <label class="field"><span>Confirm password</span>
          <input type="password" id="re-pass2" placeholder="Repeat password" required minlength="6" autocomplete="new-password"></label>
        <button class="btn btn-primary btn-block" type="submit">Create Account</button>
        <p class="form-err" id="re-err"></p>
      </form>
      <p class="modal-foot">Buy notes once → read &amp; download anytime.</p>
    </div>`;
  document.body.appendChild(wrap);

  const close = () => wrap.remove();
  wrap.querySelector("#auth-x").onclick = close;
  wrap.addEventListener("click", e => { if (e.target === wrap) close(); });

  const tabL = wrap.querySelector("#tab-login"), tabR = wrap.querySelector("#tab-register");
  tabL.onclick = () => setAuthMode("login");
  tabR.onclick = () => setAuthMode("register");

  wrap.querySelector("#form-login").addEventListener("submit", async e => {
    e.preventDefault();
    const errEl = wrap.querySelector("#li-err");
    errEl.textContent = "";
    try {
      await signInWithEmailAndPassword(auth, wrap.querySelector("#li-email").value.trim(), wrap.querySelector("#li-pass").value);
      toast("Welcome back! 🎉");
      close();
    } catch (err) { errEl.textContent = mapAuthError(err); }
  });

  wrap.querySelector("#form-register").addEventListener("submit", async e => {
    e.preventDefault();
    const errEl = wrap.querySelector("#re-err");
    errEl.textContent = "";
    const p1 = wrap.querySelector("#re-pass").value, p2 = wrap.querySelector("#re-pass2").value;
    if (p1 !== p2) { errEl.textContent = "Passwords do not match."; return; }
    try {
      await createUserWithEmailAndPassword(auth, wrap.querySelector("#re-email").value.trim(), p1);
      toast("Account created! Welcome to NoteBazaar 🎉");
      close();
    } catch (err) { errEl.textContent = mapAuthError(err); }
  });

  setAuthMode(mode);
}

function setAuthMode(mode) {
  const wrap = document.getElementById("auth-modal");
  if (!wrap) return;
  const login = mode === "login";
  wrap.querySelector("#form-login").hidden = !login;
  wrap.querySelector("#form-register").hidden = login;
  wrap.querySelector("#tab-login").classList.toggle("active", login);
  wrap.querySelector("#tab-register").classList.toggle("active", !login);
  wrap.querySelector("#li-err").textContent = "";
  wrap.querySelector("#re-err").textContent = "";
}

/* ---------- misc shared blocks ---------- */
export function configBanner() {
  return `
    <div class="empty-state">
      <div class="empty-ico">⚙️</div>
      <h3>Firebase is not configured yet</h3>
      <p>Open <b>js/firebase-config.js</b> and paste your Firebase keys.<br>
      Step-by-step guide: <b>FIREBASE-SETUP.md</b> (takes ~5 minutes).</p>
    </div>`;
}

export { auth, CONFIGURED };
