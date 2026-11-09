# 📚 NoteBazaar — Notes Selling Website

Sell study notes online with **UPI payments** — built on **Firebase**, deployable on **InfinityFree**.

- 🛠️ **Admin (you)**: upload notes (title, description, price ₹, PDF) · set **₹0 = FREE** · verify buyer payments
- 🎓 **Users**: register → browse → pay via UPI (`Q021815184@ybl` — payee **NoteBazaar**) → submit UTR → admin approves → **read online & download forever**
- 🆓 **Free notes**: price ₹0 unlocks instantly, no payment
- 🌐 **UI**: 100% English · dark premium theme · fully responsive
- 💰 **UPI ID**: `Q021815184@ybl` (shown with QR + copy button + mobile deep link)

## Quick start
1. `FIREBASE-SETUP.md` — create Firebase project, paste keys, publish rules (~10 min)
2. `INFINITYFREE-DEPLOY.md` — upload to InfinityFree & go live (~10 min)

## How the payment flow works
```
User clicks Buy ₹X
   → pays to UPI ID Q021815184@ybl (NoteBazaar) via QR / deep link
   → submits UTR (transaction ID)
   → order saved in Firestore as "pending"
   → Admin panel shows the UTR → you match it in your UPI app → Approve
   → note is added to the user's library automatically (read + download unlocked)
```
Free notes (₹0) skip payment entirely — one click adds them to the user's library.

## Files
```
index.html        Home — notes grid, search, sort (free first / price)
note.html         Note page — buy flow, UPI QR, reader, download
library.html      User's unlocked notes
admin.html        Admin panel — upload / manage notes / verify payments
css/style.css     Theme
js/firebase-config.js   ← YOUR Firebase keys + ADMIN_EMAILS + UPI ID (edit this!)
js/firebase-init.js     Firebase bootstrap (do not edit)
js/ui.js                Header, login/register modal, toasts
js/app.js               Home listing
js/note.js              Note page + purchase logic
js/library.js           Library page
js/admin.js             Admin panel logic
firestore.rules   Firestore security rules (publish in Firebase console)
storage.rules     Storage security rules (publish in Firebase console)
START-HERE.bat    Double-click on Windows to preview the site locally
```

## Data model (Firestore)
| Collection | Doc fields |
|---|---|
| `notes` | title, description, price (0 = free), fileName, filePath, fileUrl, createdAt |
| `purchases` | noteId, noteTitle, userId, userEmail, amount, upiId, utr, status (`pending/approved/rejected`), createdAt, reviewedAt |
| `users/{uid}/library/{noteId}` | created on approve (paid) or claim (free) — presence = access |
