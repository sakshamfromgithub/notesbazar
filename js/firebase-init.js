// NoteBazaar — Firebase SDK bootstrap (do not edit)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export const CONFIGURED = !String(window.FIREBASE_CONFIG?.apiKey || "").includes("PASTE_");

const fbApp = initializeApp(window.FIREBASE_CONFIG);

export { fbApp };
export const auth = getAuth(fbApp);
export const db = getFirestore(fbApp);
export const storage = getStorage(fbApp);

export function isAdmin() {
  const u = auth.currentUser;
  if (!u || !u.email) return false;
  return (window.ADMIN_EMAILS || []).map(e => String(e).toLowerCase()).includes(u.email.toLowerCase());
}
