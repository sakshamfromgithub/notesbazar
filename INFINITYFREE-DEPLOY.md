# 🚀 Deploy NoteBazaar on InfinityFree — Step by Step

**Short answer: YES ✅** — InfinityFree works perfectly for NoteBazaar.

**Why?** NoteBazaar is a *static* website (plain HTML/CSS/JS). All the heavy lifting —
login, database, PDF storage, payments — is done by **Firebase** in the browser.
InfinityFree's job is only to hand visitors your HTML/CSS/JS files. No PHP, no MySQL,
no Node.js needed.

---

## Prerequisite
Complete `FIREBASE-SETUP.md` first (Firebase keys pasted in `js/firebase-config.js`,
rules published). Takes ~10 minutes.

---

## Step 1 — Create your InfinityFree account
1. Go to **https://www.infinityfree.com** → **Register** (free).
2. Verify your email, log in to the **Client Area**.

## Step 2 — Create a hosting account (free subdomain)
1. Client Area → **Create Account**.
2. Choose **Free subdomain** → type your name, e.g. `notebazaar` → pick an ending
   like `.infinityfreeapp.com` → you get:
   **`notebazaar.infinityfreeapp.com`**
3. Wait ~5 minutes for the account to finish building (shows "Active").

> You can attach your **own custom domain** later — free SSL included.

## Step 3 — Upload the website files
**Option A — File Manager (easiest, no software):**
1. Client Area → your account → **File Manager** (opens web-based FTP view).
2. Open the **`htdocs`** folder.
3. Delete the default files inside it (e.g. `index2.html`).
4. Upload everything from the `notebazaar` folder, **keeping the structure**:
   ```
   htdocs/
   ├── index.html
   ├── note.html
   ├── library.html
   ├── admin.html
   ├── css/style.css          ← keep folder name "css"
   ├── js/  (all .js files)   ← keep folder name "js"
   ├── firestore.rules        (not used by the site, fine to upload or skip)
   ├── storage.rules
   └── *.md guides
   ```
   💡 Tip: zip the folder, upload the `.zip` into `htdocs`, right-click → **Extract**.

**Option B — FTP (FileZilla):**
- Host: `ftpupload.net` · Username/Password: from Client Area → **FTP Details**
- Port: `21` → drag the files into `htdocs/`.

## Step 4 — Add your InfinityFree domain to Firebase ⚠️ (MOST IMPORTANT)
1. Firebase Console → **Authentication → Settings → Authorized domains**.
2. **Add domain** → `notebazaar.infinityfreeapp.com` (your actual subdomain).
3. Without this step, users see **"auth/unauthorized-domain"** and cannot log in.

## Step 5 — Test your live site 🎉
| # | Test | Expected |
|---|------|----------|
| 1 | Open `https://notebazaar.infinityfreeapp.com` | Home page loads, notes visible |
| 2 | Register a test account | Login works (if it says unauthorized-domain → redo Step 4) |
| 3 | Buy a paid note via UPI | Payment sheet shows **NoteBazaar / Q021815184@ybl** + QR |
| 4 | Admin → Orders → approve | Note unlocks for the buyer |
| 5 | Open site **on your phone** → "Open UPI App" | GPay/PhonePe/Paytm opens with amount pre-filled |

---

## Things to know

**UPI payments on mobile** — the "Open UPI App" button uses an `upi://` deep link;
it works when the site is opened in a phone browser (not on desktop — desktop users
scan the QR with their phone instead).

**InfinityFree free limits** — 50,000 daily hits, ~5 GB disk, 3 email accounts.
For a notes store this is far more than enough, because **PDFs & data live on
Firebase, not on InfinityFree**.

**Firebase free (Spark) limits** — 50k logins/month, 50k reads & 20k writes per day,
5 GB PDF storage. Also plenty for a student store.

**InfinityFree housekeeping** — log in to the Client Area at least once every ~30 days
so the hosting account isn't removed as inactive.

**HTTPS** — InfinityFree gives free SSL; always share the `https://` link (UPI + clipboard
APIs need a secure context).

### Easier alternatives (optional)
If you ever want drag-and-drop hosting with zero account maintenance:
**Netlify Drop** (app.netlify.com/drop), **Vercel**, or **GitHub Pages** — all free,
upload the same folder, then add the domain to Firebase authorized domains.
InfinityFree is 100% fine though — it was made for exactly this kind of static site.

---

## 🛠️ Troubleshooting — "site looks different / changed"

**1) I double-clicked `index.html` on my PC and the topbar / notes / login are missing!**
That's normal — browsers block JavaScript modules on `file://` pages (security rule),
so the page shows only the hero and looks "changed". The design is NOT changed.
Fix (pick one):
- **Preview locally:** double-click **`START-HERE.bat`** (needs free Python from python.org).
  It opens `http://localhost:8000` → the site looks exactly like the original design.
- **Best:** deploy to InfinityFree (steps above) — everything works there.

**2) My InfinityFree domain shows a default page / 404.**
Your files probably went into a sub-folder. Open File Manager → `htdocs` — it must
contain `index.html` **directly** (i.e. `htdocs/index.html` exists, NOT
`htdocs/notebazaar/index.html`). If you see a `notebazaar` folder inside `htdocs`,
move all its contents one level up into `htdocs`.

**3) Pages show "Firebase is not configured yet".**
You haven't pasted your Firebase keys yet. Follow `FIREBASE-SETUP.md` Step 2 →
paste keys into `js/firebase-config.js` → re-upload that one file to `htdocs/js/`.

**4) Home page loads but login fails with "unauthorized-domain".**
Add your InfinityFree subdomain in Firebase Console → Authentication → Settings →
Authorized domains (Step 4 above).

**5) Design still looks different (colors/layout broken).**
Make sure the `css` and `js` folders were uploaded too — `htdocs/css/style.css` and
`htdocs/js/` (all 7 files) must exist with exactly those lowercase folder names.
