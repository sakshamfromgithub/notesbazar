# 🔥 Firebase Setup — NoteBazaar (one-time, ~10 minutes)

Do this once, then deploy (see `INFINITYFREE-DEPLOY.md`).

---

## Step 1 — Create the Firebase project
1. Go to **https://console.firebase.google.com** and sign in with your Google account.
2. Click **Add project** → name it `notebazaar` → continue (Google Analytics optional) → **Create project**.

## Step 2 — Register a Web App & copy the config
1. On the project page click the **`</>`** (Web) icon.
2. App nickname: `NoteBazaar Web` → **Register app** (skip hosting).
3. Copy the `firebaseConfig` object it shows you.
4. Open **`js/firebase-config.js`** in this project and paste your values over the `PASTE_YOUR_...` placeholders.

## Step 3 — Enable login (Authentication)
1. Left menu → **Build → Authentication → Get started**.
2. Tab **Sign-in method** → enable **Email/Password** → Save.

## Step 4 — Create the database (Firestore)
1. Left menu → **Build → Firestore Database → Create database**.
2. Location: pick the closest (e.g. `asia-south1 (Mumbai)`) → start in **production mode** → Create.
3. Open the **Rules** tab, delete everything, paste the full content of **`firestore.rules`** from this folder.
4. ⚠️ In the pasted rules replace **`REPLACE_WITH_ADMIN_EMAIL`** with YOUR login email (keep the quotes!).
5. Click **Publish**.

## Step 5 — Enable file storage (Storage)
1. Left menu → **Build → Storage → Get started** → accept default location → in production mode → Create.
2. Open the **Rules** tab, paste the full content of **`storage.rules`**.
3. ⚠️ Replace **`REPLACE_WITH_ADMIN_EMAIL`** with YOUR login email again.
4. Click **Publish**.

## Step 6 — Authorize your domains (VERY IMPORTANT)
1. **Authentication → Settings → Authorized domains**.
2. Add these:
   - `localhost` (for testing on your PC)
   - `YOURNAME.infinityfreeapp.com` — whatever subdomain you get on InfinityFree
   - your custom domain, if you add one later
3. **If you skip this, login will fail with "unauthorized-domain".**

## Step 7 — Set yourself as admin
- In **`js/firebase-config.js`** put your email inside `ADMIN_EMAILS`, e.g.:
  ```js
  const ADMIN_EMAILS = ["yourname@gmail.com"];
  ```
- Use the **same email** in both rules files (Steps 4 & 5).
- Register on the site with that email → the **Admin** page unlocks automatically.

---

## ✅ Final test checklist
| # | Test | Expected |
|---|------|----------|
| 1 | Open the site → register with your admin email | Account created |
| 2 | Admin → Upload a note with **Price 0** | Uploads with progress bar, appears on Home |
| 3 | Open the note (new browser/incognito) → **Get Free Access** | Instantly unlocked, appears in My Library |
| 4 | Admin → upload a note with **Price 99** | Shows ₹99 badge |
| 5 | Other account → Buy Now → pay ₹99 to `Q021815184@ybl` → submit UTR | Status "Payment under review" |
| 6 | Admin → Payment Orders → match UTR in your UPI app → Approve | Buyer's note unlocks automatically |
| 7 | Buyer → My Library → Read online / Download | PDF opens & downloads |

## Free-tier limits (Spark plan — ₹0/month)
- **Auth**: 50,000 monthly active users
- **Firestore**: 50,000 reads / 20,000 writes / 1 GB storage per day
- **Storage**: 5 GB stored, 1 GB/day download
- Plenty for a student notes store. Upgrade (Blaze) only if you grow big.
